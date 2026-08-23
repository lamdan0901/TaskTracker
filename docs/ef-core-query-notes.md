# EF Core Query Notes

Reference notes from reviewing `GET /api/tasks`. SQLite + EF Core 10 + .NET 10.

---

## 1. `AsNoTracking()` vs `AsQueryable()`

These are **not two options on the same axis**. They answer different questions.

|                  | What it changes                                                                      | Cost                       |
| ---------------- | ------------------------------------------------------------------------------------ | -------------------------- |
| `AsQueryable()`  | The C# **type** only. `IQueryable<T>` in, `IQueryable<T>` out. Zero behavior change. | None — no-op               |
| `AsNoTracking()` | EF's **behavior**: skip the change tracker for returned rows                         | Saves memory + CPU per row |

`DbSet<T>` already _is_ an `IQueryable<T>`, so `db.Tasks.AsQueryable()` and `db.Tasks` are the same object. Tracking is the default because it's the default of `DbSet`, **not** because of `AsQueryable()`.

### What tracking does

EF snapshots every loaded entity so `SaveChangesAsync()` can diff it and generate UPDATEs.

```csharp
// TRACKED — required, because we mutate and save.
var task = await db.Tasks.FindAsync(id);   // EF snapshots it
task.Title = "new";                        // mutate
await db.SaveChangesAsync();               // diff snapshot vs now -> UPDATE

// NO-TRACKING — read, serialize, discard. The snapshot would be pure waste.
var items = await db.Tasks.AsNoTracking().ToListAsync(ct);
```

**Rule:** tracked when the entity's next stop is `SaveChangesAsync()`. No-tracking when its next stop is JSON.

### Applied to this project

| Endpoint              | Which                 | Why                                                                  |
| --------------------- | --------------------- | -------------------------------------------------------------------- |
| `GET /api/tasks`      | `AsNoTracking()`      | Read → serialize → discard                                           |
| `GET /api/tasks/{id}` | leave `FindAsync`     | Checks the tracker's in-memory cache first, can skip the DB entirely |
| `PUT`, `DELETE`       | tracked (`FindAsync`) | Mutate then `SaveChanges` — no-tracking would silently save nothing  |
| `mark-all`            | N/A                   | `ExecuteUpdateAsync` bypasses the tracker entirely                   |

### When `AsQueryable()` is actually useful

**A. Navigation properties.** Collection navigations are `ICollection<T>` = `IEnumerable`, so LINQ on them runs **in memory** after loading every row:

```csharp
var user = await db.Users.Include(u => u.Tasks).FirstAsync(ct);
var done = user.Tasks.Where(t => t.IsDone).ToList();   // loads 10,000 to keep 3

// Correct fix — .Query() is the IQueryable entry point for a navigation:
var done = await db.Entry(user).Collection(u => u.Tasks).Query()
    .Where(t => t.IsDone)
    .ToListAsync(ct);                                   // SQL WHERE, loads 3
```

**B. Unifying branch types.** A ternary needs both arms to be the same type:

```csharp
var source = useCache ? cachedTasks : db.Tasks;                    // doesn't compile
IQueryable<TaskItem> source = useCache ? cachedTasks.AsQueryable() : db.Tasks;  // compiles
```

**C. Repository returning `IQueryable`** — contested pattern; leaks EF into callers.

**D. In-memory test fakes** — fragile, LINQ-to-Objects accepts expressions EF rejects. Prefer an SQLite in-memory `DbContext`.

---

## 2. Stable paging — always add a tiebreaker

Paging is **two separate SQL statements**, minutes apart. Nothing forces the DB to order tied rows the same way twice.

Five tasks with the same `CreatedAt`, `pageSize=2`:

```
Page 1 returns: [A, B]
Page 2 returns: [B, C]   <- B repeats, A is now unreachable
```

Fix: append a unique key so the ordering is a deterministic **total order**.

```csharp
var desc = q.SortDirOrDefault == "desc";

// Declare as IOrderedQueryable, not var — that's the type exposing ThenBy.
IOrderedQueryable<TaskItem> ordered = q.SortByOrDefault switch
{
    "title"  => desc ? query.OrderByDescending(t => t.Title)     : query.OrderBy(t => t.Title),
    "isDone" => desc ? query.OrderByDescending(t => t.IsDone)    : query.OrderBy(t => t.IsDone),
    _        => desc ? query.OrderByDescending(t => t.CreatedAt) : query.OrderBy(t => t.CreatedAt),
};

query = ordered.ThenBy(t => t.Id);   // ORDER BY CreatedAt DESC, Id ASC
```

`OrderBy` sets the primary key; `ThenBy` breaks ties in it. The PK is the natural choice: unique, immutable, already indexed.

Sorting by `isDone` is the extreme case — 2 distinct values means ~50-way ties, so without a tiebreaker that endpoint is essentially random per page.

**Also:** the sort must come before `Skip`/`Take`, or the slice is arbitrary.

---

## 3. Indexes

### Why an index removes the sort

Without an index, `ORDER BY CreatedAt DESC LIMIT 5` forces SQLite to:

1. **Scan** every row (rows sit in PK order, which says nothing about `CreatedAt`)
2. **Sort** all of them — temp B-tree, or external merge sort on disk
3. **Discard** all but 5

100,000 rows sorted to return 5. Cost is **O(n log n)** in _table_ size, and it grows even though page size never changes.

An index is a **B-tree already sorted by its key**, storing `(CreatedAt, rowid)`. Sorted order is the structure's invariant, maintained on every insert — the ordering work moves to write time, spread across writes, instead of all at once on every read. So:

1. **Seek** to one end of the index
2. **Walk** 5 entries (leaves are linked — sequential)
3. Follow `rowid` to fetch each row
4. **Stop.** Rows 6..100,000 never touched

Cost is **O(log n + page_size)**, where the `n` term is a tree descent of 3–4 node reads.

> The index isn't making the sort faster — it's **deleting** the sort. `LIMIT` can then short-circuit, which it fundamentally cannot do with a sort between scan and output: you can't know which 5 rows are the top 5 until you've compared all of them.

This is why the ordering must match exactly. `ORDER BY CreatedAt DESC, Id ASC` uses `IX_Tasks_CreatedAt` for the first key then sorts only within tied groups (cheap, ties are few). `ORDER BY Title` cannot use it at all.

### When to add one

Add when a column appears in `WHERE`, `ORDER BY`, or `JOIN` on a table big enough that a scan hurts.

**The cost side:** every index is a second B-tree updated on every INSERT/UPDATE/DELETE, plus disk. Indexes trade write speed for read speed.

| Situation                                   | Index?               |
| ------------------------------------------- | -------------------- |
| Foreign key columns                         | Yes, almost always   |
| Default `ORDER BY` column                   | Yes                  |
| Frequently filtered, many distinct values   | Yes                  |
| Low-cardinality (`IsDone`, 2 values)        | Marginal — see below |
| Only ever `SELECT`ed, never filtered/sorted | No                   |
| Write-heavy, rarely read                    | Be stingy            |
| Table under ~1,000 rows                     | Doesn't matter       |

On `IsDone`: `WHERE IsDone = 0` matches ~half the table, so SQLite will often _correctly_ ignore the index — random-access into half the rows beats reading them all sequentially. Low-cardinality columns earn their keep mainly as the **leading column of a composite**.

### Composite indexes

```csharp
// Serves "filter by IsDone, then sort by CreatedAt" with one index.
modelBuilder.Entity<TaskItem>().HasIndex(t => new { t.IsDone, t.CreatedAt });
```

Column order matters: equality-filtered column first, range/sort column second. Indexes are usable **left-to-right only** — `(IsDone, CreatedAt)` also serves a filter on `IsDone` alone, but _not_ a sort on `CreatedAt` alone.

No index helps `LIKE '%x%'` — a leading wildcard can't use a B-tree. That needs FTS5.

### Where the config goes

`Data/AppDbContext.cs`:

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);   // runs conventions + provider config

    modelBuilder.Entity<TaskItem>().HasIndex(t => t.CreatedAt);
    modelBuilder.Entity<TaskItem>().HasIndex(t => t.IsDone);
}
```

Mapping config belongs here, not in the routes. It feeds both the migration generator and the SQL translator. No `IX_Tasks_Id` needed — SQLite indexes the PK automatically, which is why `ThenBy(t => t.Id)` costs nothing.

---

## 4. Case-insensitive search — the `instr` trap

**The LINQ method you write determines the SQL function, and different SQL functions obey different rules.**

`Contains` translates to SQLite's `instr()`, which is byte-comparison and **ignores collation entirely**. Collation governs comparison operators, not function arguments.

Verified against a column explicitly declared `COLLATE NOCASE`:

```sql
CREATE TABLE t (Title TEXT COLLATE NOCASE);
INSERT INTO t VALUES ('fs task');

SELECT count(*) FROM t WHERE instr(Title, 'FS') > 0;   -- 0 rows  <- what Contains() emits
SELECT count(*) FROM t WHERE Title LIKE '%FS%';        -- 1 row
SELECT count(*) FROM t WHERE Title = 'FS TASK';        -- 1 row
```

| LINQ                        | SQL                 | Collation-aware?                             |
| --------------------------- | ------------------- | -------------------------------------------- |
| `.Contains(s)`              | `instr(col, s) > 0` | **No**                                       |
| `== s`                      | `col = s`           | Yes                                          |
| `EF.Functions.Like(col, p)` | `col LIKE p`        | N/A — ASCII-insensitive by default in SQLite |

EF uses `instr` for `Contains` deliberately, to avoid mis-handling `%` and `_` in user input.

### The fix

```csharp
if (!string.IsNullOrWhiteSpace(q.Search))
{
    // Escape LIKE wildcards, or a search for "50%" matches every row.
    // Backslash FIRST — otherwise it re-escapes the backslashes added below.
    var escaped = q.Search
        .Replace("\\", "\\\\")
        .Replace("%", "\\%")
        .Replace("_", "\\_");

    query = query.Where(t => EF.Functions.Like(t.Title, $"%{escaped}%", "\\"));
}
```

Needs `using Microsoft.EntityFrameworkCore;`. No migration required — SQLite's `LIKE` is ASCII-case-insensitive regardless of column collation.

The escaping is genuinely required: unescaped `%` from a user turns every search into a full-table match.

### Other options

**`ToLower()`** — works, but wrapping a column in a function makes it **non-sargable**: the index stores `Title`, not `lower(Title)`, so it can't be used. Moot for `Contains` (no index anyway), but it matters a lot for `WHERE lower(Email) = ...`.

**Column collation** — declare the column case-insensitive so `==` and `ORDER BY` are insensitive everywhere:

```csharp
modelBuilder.Entity<TaskItem>().Property(t => t.Title).UseCollation("NOCASE");
```

Does **not** help `Contains`/`instr`. Only worth it when you have equality lookups on the column.

### Limitation: everything above is ASCII-only

Measured on this project's actual stack (EF Core 10 → Microsoft.Data.Sqlite → e_sqlite3 3.49.1), using `char(n)` codepoints so console encoding can't distort the test:

| Mechanism                         | `A` / `a` | `Ệ` / `ệ` (U+1EC6 / U+1EC7) |
| --------------------------------- | --------- | --------------------------- |
| `NOCASE` collation on `=`         | ✅        | ❌                          |
| `LIKE`                            | ✅        | ❌                          |
| `lower()` / `upper()`             | ✅        | ❌ returns input unchanged  |
| `instr()` (what `Contains` emits) | ❌        | ❌                          |

So `EF.Functions.Like` fixes `FS` vs `fs` and does **nothing** for `VIỆT` vs `việt`.

**Custom C# collation doesn't rescue it** — same reason collation never reaches `instr`:

```csharp
conn.CreateCollation("UNICODE_CI", (a, b) => string.Compare(a, b, StringComparison.OrdinalIgnoreCase));
```

| Applied to | Result     |
| ---------- | ---------- |
| `=`        | ✅ works   |
| `LIKE`     | ❌ ignored |
| `instr`    | ❌ ignored |

---

## 4b. Non-ASCII search — normalized shadow column

Store a search-ready copy of the text, and fold the incoming query the same way. Both sides become lowercase ASCII, so case and accents stop mattering — and plain `Contains` works again, with no `LIKE` wildcard escaping to get wrong.

```csharp
// Models/SearchText.cs
using System.Globalization;
using System.Text;

namespace TaskTracker.Api.Models;

public static class SearchText
{
    /// Folds text to a comparison-friendly form: lowercase, accents stripped.
    /// Applied to BOTH stored values and incoming queries — they only need to
    /// agree with each other, not to be linguistically correct.
    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;

        // ToLowerInvariant covers the full Unicode range, unlike SQLite's lower().
        var lowered = value.ToLowerInvariant();

        // FormD splits "ế" into "e" + combining accent, so accents become
        // separate NonSpacingMark chars we can drop.
        var decomposed = lowered.Normalize(NormalizationForm.FormD);

        var sb = new StringBuilder(decomposed.Length);
        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark)
                continue;

            // đ is a DISTINCT LETTER, not d + accent, so FormD leaves it intact.
            // Verified: "Đường" -> NFD+strip -> "Đuong". Same class as ø, ł, ß.
            sb.Append(c == 'đ' ? 'd' : c);
        }

        return sb.ToString().Normalize(NormalizationForm.FormC);
    }
}
```

Add the column (`[JsonIgnore]` so it never leaves the API):

```csharp
public class TaskItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool IsDone { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public string TitleSearch { get; set; } = string.Empty;   // derived from Title
}
```

Sync it in one place so no call site can forget:

```csharp
// AppDbContext
public override int SaveChanges()
{
    SyncSearchColumns();
    return base.SaveChanges();
}

public override Task<int> SaveChangesAsync(CancellationToken ct = default)
{
    SyncSearchColumns();
    return base.SaveChangesAsync(ct);
}

private void SyncSearchColumns()
{
    // ChangeTracker only sees TRACKED entities — which is why write paths must
    // stay tracked. ExecuteUpdateAsync bypasses this entirely.
    foreach (var entry in ChangeTracker.Entries<TaskItem>())
    {
        if (entry.State is EntityState.Added or EntityState.Modified)
            entry.Entity.TitleSearch = SearchText.Normalize(entry.Entity.Title);
    }
}
```

Query — no `LIKE`, no escaping, because both sides are pre-folded:

```csharp
if (!string.IsNullOrWhiteSpace(q.Search))
{
    var needle = SearchText.Normalize(q.Search);
    query = query.Where(t => t.TitleSearch.Contains(needle));
}
```

`instr()` being case-sensitive is now irrelevant — nothing reaching it has case left.

Backfill existing rows once after the migration. Bonus: search becomes **diacritic-insensitive** (`duong` matches `Đường`), which is usually what Vietnamese users want since typing accents is slow.

### Alternative: FTS5

Verified available in the bundled `e_sqlite3`:

```
tokenize = "unicode61 remove_diacritics 2"
  MATCH 'viet'  -> 1      MATCH 'VIET' -> 1
  MATCH 'tieng' -> 1      MATCH 'vie*' -> 1
  MATCH 'duong' -> 0      <- đ survives here TOO
```

Real inverted index, ranking, prefix queries. Note the **same `đ` gap** — FTS5 is not a shortcut past normalization. Worth it for word-boundary or ranked matching, not for substring filtering on a task list.

### Other databases

Not a SQLite quirk you outgrow by switching — just differently shaped:

| DB             | Approach                                                                              |
| -------------- | ------------------------------------------------------------------------------------- |
| **Postgres**   | `citext`, or `unaccent(lower(col))` with an expression index                          |
| **SQL Server** | Case-insensitive by default; `COLLATE Latin1_General_CI_AI` adds accent-insensitivity |
| **MySQL**      | `utf8mb4_unicode_ci` — both, by default                                               |

The shadow column is the one design that ports unchanged to all of them.

---

## 5. `CancellationToken`

Pass it to every async DB call. Minimal APIs bind it automatically — no attribute, no registration.

```csharp
app.MapGet("/api/tasks", async (
    AppDbContext db,
    [AsParameters] TaskQueryRequest q,
    CancellationToken ct) =>
{
    var totalCount = await query.CountAsync(ct);
    var items = await query.Skip(pageIndex * pageSize).Take(pageSize).ToListAsync(ct);
});
```

**Why:** on client disconnect (closed tab, timeout, cancelled fetch), ASP.NET Core signals the token, EF aborts the command, the connection returns to the pool. Without it the server finishes work whose result it throws away — under load, that's how you exhaust the connection pool from clients who already left.

The habit matters more than any single endpoint: you can't predict which query gets slow, and retrofitting means touching every call site.

| Method                                               | Note                                                                                     |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `CountAsync` / `ToListAsync` / `FirstOrDefaultAsync` | Always pass it                                                                           |
| `SaveChangesAsync` / `ExecuteUpdateAsync`            | Pass it — see write caveat                                                               |
| `FindAsync(id)`                                      | Awkward overload: `FindAsync(new object[] { id }, ct)`. Fine to skip on a fast PK lookup |

**Write caveat.** On GETs cancellation is free. On writes, cancelling mid-`SaveChangesAsync` leaves you unsure whether the transaction committed — the DB may finish as your token fires. Still pass it (rollback is handled correctly), but don't read "request cancelled" as "nothing happened." The real answer for that is idempotency keys.

**Gotcha:** cancellation surfaces as `OperationCanceledException`. That's expected control flow, not an error — don't log it at error level or your logs fill with users closing tabs.

---

## 6. Migrations

`add` writes C#. `update` executes it. **Two steps, always.**

```bash
dotnet ef migrations add <Name>      # writes Migrations/<timestamp>_<Name>.cs — DB untouched
dotnet ef database update            # applies all pending migrations
dotnet ef migrations list            # shows applied vs (Pending)   <- the one to remember
dotnet ef migrations remove          # deletes last migration — ONLY if unapplied
```

Run from the folder containing the `.csproj` (`server/TaskTracker.Api`).

### Three states, not two

| State                 | Where                                   | How to check                |
| --------------------- | --------------------------------------- | --------------------------- |
| Written               | `Migrations/*.cs` on disk               | `ls Migrations/`            |
| Applied               | `__EFMigrationsHistory` table in the DB | `dotnet ef migrations list` |
| Reflected in baseline | `AppDbContextModelSnapshot.cs`          | updated by `add`            |

**Never leave a migration written-but-unapplied.** The snapshot then describes a schema the DB doesn't have, so the _next_ `migrations add` diffs against the wrong baseline.

### Always read the generated file before applying

Expect only the delta you asked for:

```csharp
protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.CreateIndex(name: "IX_Tasks_CreatedAt", table: "Tasks", column: "CreatedAt");
}
```

If you see an unexpected `DropTable` or column change, something drifted — stop and investigate rather than applying.

### Inspecting the DB directly

```bash
sqlite3 tasks.db ".schema Tasks"
sqlite3 tasks.db "SELECT MigrationId FROM __EFMigrationsHistory;"
```

`sqlite3` also takes `EXPLAIN QUERY PLAN <sql>`. Look for `USE TEMP B-TREE FOR ORDER BY` — that line means the sort is _not_ using an index.

⚠️ But see section 7 before trusting CLI results about string behavior.

---

## 7. The `sqlite3` CLI is not your app's SQLite

**Different binaries, different behavior.** The app loads the native library bundled with `Microsoft.Data.Sqlite` (SQLitePCLRaw `e_sqlite3`). The `sqlite3` on PATH is whatever else is installed — on this machine, Android platform-tools.

Measured difference, same query:

|                      | Android CLI 3.44.3 | app's e_sqlite3 3.49.1 |
| -------------------- | ------------------ | ---------------------- |
| `lower(U+1EC6)`      | folds to U+1EC7    | unchanged              |
| `U+1EC6 LIKE U+1EC7` | 1                  | 0                      |

A CLI test would have said Vietnamese search works. It doesn't.

**Safe with the CLI:** schema (`.schema`), migration history, `EXPLAIN QUERY PLAN`, row data.
**Not safe:** anything about case folding, collation, `LIKE`, or string functions.

To test string behavior properly, use a scratch console app referencing `Microsoft.Data.Sqlite` — and build test strings from `char(n)` codepoints so terminal encoding can't distort the result:

```csharp
using var conn = new SqliteConnection("Data Source=:memory:");
conn.Open();
using var cmd = conn.CreateCommand();
cmd.CommandText = "select char(7878) like char(7879)";   // U+1EC6 vs U+1EC7
Console.WriteLine(cmd.ExecuteScalar());
```

---

## 8. See the SQL

The single best way to learn EF: write LINQ, read the SQL, notice when they disagree. In `Program.cs`:

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlite(connectionString);

    if (builder.Environment.IsDevelopment())
    {
        options.LogTo(Console.WriteLine, LogLevel.Information)
               .EnableSensitiveDataLogging();  // shows parameter VALUES — dev only, may be PII
    }
});
```

This would have caught the `instr` bug immediately — `instr(...)` in the log instead of the expected `LIKE`.

---

## 9 Naming convention

Suffix Direction Example
...Request client → server TaskCreateRequest
...Response server → client TaskResponse

Contracts/TaskResponse.cs — write this LATER, not now

```csharp
public sealed record TaskResponse(int Id, string Title, bool IsDone, DateTime CreatedAt)
{
    public static TaskResponse From(TaskItem t) => new(t.Id, t.Title, t.IsDone, t.CreatedAt);
}
```

---

## 10 Folder structure

server/TaskTracker.Api/
Features/Tasks/
├── TaskEndpoints.cs # thin: calls the Map\* below
├── CreateTask.cs # TaskCreateRequest + validation + handler
├── UpdateTask.cs # TaskUpdateRequest + handler
├── ListTasks.cs # TaskQueryRequest + filter/sort/page logic
├── MarkAllTasks.cs # MarkAllRequest + handler
└── DeleteTask.cs
...
├── Common/
│ ├── PagedResult.cs
│ └── ValidationExtensions.cs
├── Data/
│ ├── AppDbContext.cs
│ └── Entities/
│ ├── TaskItem.cs
│ ├── UserAccount.cs
│ └── Project.cs
└── Program.cs

- When subfolders are right:

Features/Tasks/
├── CreateTask.cs
├── ListTasks.cs
├── Comments/ ← its own use cases, its own DTOs
│ ├── AddComment.cs
│ └── ListComments.cs
└── Attachments/
└── UploadAttachment.cs

---

## Checklist for a list endpoint

- [ ] `AsNoTracking()` on read-only queries
- [ ] Validate at the boundary before touching the DB
- [ ] Count the filtered set **before** paging (`totalCount` = matches, not page size)
- [ ] Whitelist sort columns via `switch` — never interpolate a column name
- [ ] `ThenBy` on the PK so paging is deterministic
- [ ] `Skip`/`Take` **after** the sort
- [ ] `CancellationToken` on every async DB call
- [ ] Index the default sort column and common filters
- [ ] Case-insensitive search: `EF.Functions.Like` (escaped) if ASCII-only data; normalized shadow column if not

---

## Deliberately skipped

- **Keyset pagination** (`WHERE CreatedAt < @last`) — offset paging degrades at high page numbers because the DB still walks the skipped rows. Add when that's measurably slow.
- **FTS5 full-text search** — add when `%term%` scans get slow or you need word-boundary / ranked matching.
- **Single-query count + page** (window function) — costs more than it saves at this size.
