### Path 1: Relational Data & EF Core Relationships _(✅ Done)_

Right now `TaskItem` is a standalone table. In real-world backends, entities almost always relate to one another.

- **Option A: Categories / Lists (One-to-Many `1 : N`)** — ✅ shipped
  - **Feature**: Organize tasks into Categories (e.g., "Work", "Personal", "Study"). A category has many tasks; a task belongs to one category.
  - **What you'll learn**:
    - EF Core Foreign Keys & Navigation properties (`CategoryId`, `Category`).
    - Eager loading (`.Include()`) vs Projection (`.Select()`).
    - Adding a new feature slice (`Features/Categories/`) and linking slices via `Data/Entities/`.
    - Handling relational cascading deletes vs `SetNull`.
- **Option B: Tags (Many-to-Many `N : M`)** — ✅ shipped
  - **Feature**: Attach multiple tags (e.g., `#urgent`, `#frontend`, `#bug`) to tasks.
  - **What you'll learn**:
    - EF Core many-to-many skip navigations and join tables.
    - Querying tasks filtered by multiple tags (e.g., `?tags=urgent,frontend`).
- **Option C: Subtasks / Checklist Items (Nested Domain Slice)** — ✅ shipped
  - **Feature**: Break down a task into smaller checklist items (`POST /api/tasks/{id}/subtasks`).
  - **What you'll learn**:
    - Sub-domain feature structure (e.g., `Features/Tasks/Subtasks/`).
    - Aggregate root thinking (managing child entities through their parent).

---

### Path 2: Rich Domain Fields & Advanced Querying _(partially done — Priority + DueDate shipped)_

- **Feature: Due Dates, Priority Levels & Soft Deletes**
  - **What you'll learn**:
    - **Enums in EF Core & APIs**: `Priority` (`Low`, `Medium`, `High`, `Urgent`). ✅
    - **Date/Time handling**: `DateOnly` vs `DateTimeOffset` (UTC storage vs user timezone comparisons). ✅
    - **Custom Query Filters**: Querying `?status=overdue`, `?due=today`, `?due=this-week`.
    - **Soft Deletes**: Adding `IsDeleted` flag and configuring **EF Core Global Query Filters** (`HasQueryFilter`) so deleted items are hidden automatically without rewriting every query.

---

### Path 3: Authentication & Multi-Tenancy (User-Scoped Data) — **DESIGN LOCKED, NEXT UP**

**Decisions made** (2026-08-27 brainstorm):

| Question | Choice | Why |
| :--- | :--- | :--- |
| Auth mechanism | **Hand-rolled JWT** | Own `User`, own `/register` + `/login`, own token signing. Most learning per line — you see how a claim becomes a `ClaimsPrincipal`. |
| Tenancy shape | **Per-user now, org later** | `OwnerId` on entities. The `ICurrentUser` abstraction is required anyway (the DbContext query filter has to read the current user from DI), so it is not speculative. No `TenantId` indirection until orgs actually arrive. |
| Owned entities | **Task + Category + Tag** | `Subtask` inherits ownership through its parent task — aggregate root rule. |
| Token scope | **Access + refresh rotation** | Split into Phase A (access only) and Phase B (rotation) so each phase ships and runs on its own. |
| Existing data | **Wipe `tasks.db`, start fresh** | Learning DB, no real data. `OwnerId` goes in as required non-nullable, no backfill SQL. |
| Enforcement | **Global query filter, arrived at through explicit `Where`** | Write the explicit version first, prove the leak, *then* replace it with the filter. Learn why the filter exists, not just that it exists. |

**Server-code rule still applies:** everything below is template + guidance + file location. You write the `server/` code. Client code under `client/` can be generated.

---

## Phase A — Authentication + User Scoping

### A1. Data model

**New file — `server/TaskTracker.Api/Data/Entities/User.cs`**

```csharp
namespace TaskTracker.Api.Data.Entities;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;

    // Never store the password. Store the output of PasswordHasher<User>.HashPassword().
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Inverse navigations — optional, but they make cascade-delete intent explicit.
    public List<TaskItem> Tasks { get; set; } = [];
    public List<Category> Categories { get; set; } = [];
    public List<Tag> Tags { get; set; } = [];
}
```

**Edit — `Data/Entities/TaskItem.cs`, `Category.cs`, `Tag.cs`.** Add to each:

```csharp
    // Required (non-nullable int) — every row must have an owner.
    public int OwnerId { get; set; }
    public User Owner { get; set; } = null!;
```

**`Data/Entities/Subtask.cs` — add nothing.** A subtask is only reachable through
`/api/tasks/{id}/subtasks`, and the parent task is already filtered. A second
`OwnerId` here could disagree with the parent's — a column you must keep in sync
is a bug waiting to happen.

**New file — `Data/Configurations/UserConfiguration.cs`**

```csharp
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.Property(u => u.Email)
            .HasMaxLength(256)
            .UseCollation("NOCASE")   // same trick you already use for Category.Name
            .IsRequired();

        builder.HasIndex(u => u.Email).IsUnique();

        builder.Property(u => u.PasswordHash).IsRequired();
    }
}
```

**Edit — `Data/Configurations/CategoryConfiguration.cs` and `TagConfiguration.cs`.**
This is the subtle one. Today you have:

```csharp
builder.HasIndex(c => c.Name).IsUnique();   // GLOBAL unique — becomes a bug
```

Once data is per-user, a global unique name means **user B cannot create a category
called "Work" because user A already has one**. It must become a composite:

```csharp
builder.HasIndex(c => new { c.OwnerId, c.Name }).IsUnique();

builder.HasOne(c => c.Owner)
    .WithMany(u => u.Categories)
    .HasForeignKey(c => c.OwnerId)
    .OnDelete(DeleteBehavior.Cascade);   // delete the user, their categories go too
```

Same edit in `TagConfiguration.cs` (with `u => u.Tags`).

**Edit — `Data/Configurations/TaskItemConfiguration.cs`.** Every query now filters on
`OwnerId` first, so the existing single-column indexes should become `OwnerId`-leading
composites. A composite index only helps when the query filters on its **leading**
column, so `HasIndex(t => t.CreatedAt)` stops earning its keep the moment every query
also filters `OwnerId`:

```csharp
builder.HasIndex(t => new { t.OwnerId, t.CreatedAt });
builder.HasIndex(t => new { t.OwnerId, t.IsDone });
builder.HasIndex(t => new { t.OwnerId, t.DueDate });
builder.HasIndex(t => new { t.OwnerId, t.Priority });
builder.HasIndex(t => t.CategoryId);   // leave as-is: FK lookup, not owner-scoped

builder.HasOne(t => t.Owner)
    .WithMany(u => u.Tasks)
    .HasForeignKey(t => t.OwnerId)
    .OnDelete(DeleteBehavior.Cascade);
```

**Edit — `Data/AppDbContext.cs`:** add `public DbSet<User> Users => Set<User>();`

**Migration:** delete `server/TaskTracker.Api/tasks.db`, then
`dotnet ef migrations add AddUsersAndOwnership` → `dotnet ef database update`.

---

### A2. Packages and configuration

```bash
cd server/TaskTracker.Api
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package Microsoft.Extensions.Identity.Core
```

- `JwtBearer` — the middleware that validates the incoming `Authorization: Bearer` header.
- `Identity.Core` — brings `PasswordHasher<T>`. **Do not hand-roll PBKDF2.** Hand-rolling
  the token flow teaches you something; hand-rolling password hashing just produces a
  weaker hash than the one already in the box.

**Security — the signing key does not go in `appsettings.json`.** That file is committed
to git, and a key in git history is compromised permanently, even after you delete it.
Use user-secrets:

```bash
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "<paste at least 32 random bytes, base64>"
```

Non-secret settings *can* live in `appsettings.json`:

```json
"Jwt": {
  "Issuer": "TaskTracker",
  "Audience": "TaskTracker.Client",
  "AccessTokenMinutes": 60
}
```

Configuration merges by key, so `Jwt:Key` from user-secrets and `Jwt:Issuer` from
`appsettings.json` land in the same `Jwt` section at runtime.

---

### A3. Auth slice — `server/TaskTracker.Api/Features/Auth/`

Same shape as your existing slices: one file per use case, one registration point.

```text
Features/Auth/
├── AuthEndpoints.cs     # MapAuthEndpoints() — the single line Program.cs calls
├── RegisterUser.cs      # POST /api/auth/register
├── LoginUser.cs         # POST /api/auth/login
├── Me.cs                # GET  /api/auth/me   (.RequireAuthorization())
└── TokenService.cs      # builds and signs the JWT
```

**`TokenService.cs` — template:**

```csharp
public sealed class TokenService(IConfiguration config)
{
    public (string Token, DateTime ExpiresAt) CreateAccessToken(User user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(config["Jwt:Key"]!));

        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Claims are the payload of the token — the facts the API will trust
        // on every later request without touching the database.
        // Keep them small: they travel on EVERY request.
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var expires = DateTime.UtcNow.AddMinutes(
            config.GetValue<int>("Jwt:AccessTokenMinutes"));

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: expires,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}
```

Register in `Program.cs`: `builder.Services.AddSingleton<TokenService>();`

**`RegisterUser.cs` — shape** (mirror your `CreateCategory.cs`):

```csharp
public sealed record RegisterRequest(
    [property: EmailAddress, Required] string Email,
    [property: Required, MinLength(8)] string Password);

public static class RegisterUser
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/api/auth/register", Handle);

    private static async Task<IResult> Handle(
        RegisterRequest req, AppDbContext db, CancellationToken ct)
    {
        // Check first for a clean 409 instead of letting the unique index
        // throw a DbUpdateException your GlobalExceptionHandler turns into a 500.
        if (await db.Users.AnyAsync(u => u.Email == req.Email, ct))
            return Results.Conflict($"Email '{req.Email}' is already registered.");

        var user = new User { Email = req.Email };
        // HashPassword generates a random salt internally and embeds it in the
        // output string. That is why two identical passwords hash differently.
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, req.Password);

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/users/{user.Id}", new { user.Id, user.Email });
    }
}
```

**`LoginUser.cs` — the important bit:**

```csharp
var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email, ct);

// Same response for "no such user" and "wrong password".
// Different responses would let an attacker enumerate which emails are registered.
if (user is null) return Results.Unauthorized();

var result = new PasswordHasher<User>()
    .VerifyHashedPassword(user, user.PasswordHash, req.Password);

if (result == PasswordVerificationResult.Failed) return Results.Unauthorized();

var (token, expiresAt) = tokens.CreateAccessToken(user);
return Results.Ok(new { accessToken = token, expiresAt });
```

**`Me.cs`** — `GET /api/auth/me`, `.RequireAuthorization()`, returns id + email read
straight off `ClaimsPrincipal`. Gives the client something to call on boot, and proves
your claims plumbing works before you touch a single task query.

**Claim-name gotcha, worth hitting on purpose:** you write the claim `sub`, then read it
back and it is **not** there — `JwtBearer` rewrites inbound claim names through
`JwtSecurityTokenHandler.DefaultInboundClaimTypeMap`, so `sub` arrives as
`ClaimTypes.NameIdentifier`. Either read `ClaimTypes.NameIdentifier`, or turn the mapping
off in `Program.cs`:

```csharp
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
```

---

### A4. `ICurrentUser` and the scoping enforcement

**New file — `Common/ICurrentUser.cs`:**

```csharp
public interface ICurrentUser
{
    // Nullable on purpose. `dotnet ef migrations` builds the DbContext with no
    // HTTP request in flight — if this throws, your migrations stop working.
    int? Id { get; }
    int RequireId();
}

public sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public int? Id =>
        int.TryParse(
            accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier),
            out var id) ? id : null;

    public int RequireId() => Id
        ?? throw new InvalidOperationException("No authenticated user on this request.");
}
```

Register: `builder.Services.AddHttpContextAccessor();` and
`builder.Services.AddScoped<ICurrentUser, CurrentUser>();`

**Do it in this order — the order is the lesson:**

**Step 1 — explicit, in two handlers only.** In `ListTasks.cs` and `GetTask.cs`, inject
`ICurrentUser` and add `.Where(t => t.OwnerId == currentUser.RequireId())`. Leave
`UpdateTask.cs` untouched.

**Step 2 — prove the leak.** Register two users. As user A, create a task, note its id.
Log in as user B and `PUT /api/tasks/{A's id}`. It succeeds. You just edited another
user's data while authenticated as yourself. That is **IDOR** (Insecure Direct Object
Reference) — the most common authorization bug shipped in real APIs, and it is invisible
in code review precisely because the missing line is *nothing at all*.

**Step 3 — replace with the filter.** In `AppDbContext.OnModelCreating`:

```csharp
public class AppDbContext(
    DbContextOptions<AppDbContext> options,
    ICurrentUser currentUser) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Applied to EVERY LINQ query against these entities, including
        // navigations loaded through .Include().
        // Compare against currentUser.Id (nullable) — at design time it is null
        // and the filter matches nothing, which is the safe direction.
        modelBuilder.Entity<TaskItem>().HasQueryFilter(t => t.OwnerId == currentUser.Id);
        modelBuilder.Entity<Category>().HasQueryFilter(c => c.OwnerId == currentUser.Id);
        modelBuilder.Entity<Tag>().HasQueryFilter(t => t.OwnerId == currentUser.Id);
    }
}
```

Then **delete** the explicit `.Where`s from step 1 and re-run step 2. The `PUT` now 404s.

**Three things about query filters that bite people:**

1. **Filters do not apply to inserts.** Every create handler must set
   `OwnerId = currentUser.RequireId()` by hand — `CreateTask`, `CreateCategory`,
   `CreateTag`, and the `Tags` lookup inside `UpdateTask`. This asymmetry — reads
   protected automatically, writes not at all — is the #1 query-filter mistake.
2. **404, not 403.** A 403 confirms the id exists and belongs to someone else. The filter
   makes the row simply not exist for this user, and your `GetTask` already returns
   `Results.NotFound()` when the query yields null — correct for free.
3. **`IgnoreQueryFilters()` exists** and turns all of this off for one query. Fine for an
   admin feature later; a hole if used carelessly.

**One `DbContext` caveat this introduces:** `AppDbContext` now depends on
`IHttpContextAccessor`. A `BackgroundService` (Path 4) resolves a scoped `DbContext` with
no HTTP request, so `currentUser.Id` is null and every query returns nothing. When you
reach Path 4 the fix is `IgnoreQueryFilters()` in the background worker.

---

### A5. Pipeline wiring — `Program.cs`

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,          // rejects expired tokens
            ValidateIssuerSigningKey = true,  // the one that actually stops forgery
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
            ClockSkew = TimeSpan.FromSeconds(30), // default is 5 MINUTES — surprisingly generous
        };
    });

builder.Services.AddAuthorization();
```

Middleware order — this matters, and getting it wrong fails quietly:

```csharp
app.UseExceptionHandler();
app.UseCors("AllowFE");
app.UseHttpsRedirection();

app.UseAuthentication();   // reads the token, builds HttpContext.User
app.UseAuthorization();    // enforces .RequireAuthorization()

app.MapAuthEndpoints();    // anonymous
app.MapTaskEndpoints();
app.MapCategoryEndpoints();
app.MapTagEndpoints();
```

`UseAuthentication` **before** `UseAuthorization`, both **before** endpoints. Reversed, you
get 401s on valid tokens with no useful error.

Protect the slices — cleanest place is inside each `Map*Endpoints()`, on a route group:

```csharp
var group = app.MapGroup("/api/tasks").RequireAuthorization();
```

CORS needs no change: `AllowAnyHeader()` already permits `Authorization`.

---

### A6. Runnable check

No test project exists, and this does not need one. Add
`server/TaskTracker.Api/TaskTracker.Api.http` — register two users, log both in, have
user B fetch user A's task id, expect **404**. Re-runnable from VS Code's REST client,
zero dependencies. If the scoping ever breaks, this file fails.

---

### A7. Client — `client/TaskTracker`

- `src/components/LoginForm.tsx` — email + password, register / login toggle.
- `src/auth.ts` — token in `localStorage`, `getToken()` / `setToken()` / `clearToken()`.
- `src/api.ts` — attach `Authorization: Bearer ${token}`; on `401`, clear token and
  bounce to login.
- `App.tsx` — no token → render `LoginForm`; token → render the existing app.

---

## Phase B — Refresh Token Rotation

Ships on top of a working Phase A. Do not start it until the `.http` check passes.

### B1. Why this exists

A JWT is **stateless**: the API validates the signature and never asks the database
whether the token is still good. That makes it fast and makes **logout impossible** —
a stolen token stays valid until it expires. The industry answer is two tokens:

- **Access token** — JWT, short-lived (drop `Jwt:AccessTokenMinutes` from 60 to **15**).
  Stateless. A stolen one is dangerous for at most 15 minutes.
- **Refresh token** — opaque random string, long-lived (7 days), **stored in the
  database**, exchangeable for a new access token. Because it is stored, it can be revoked.

### B2. Data model

**New file — `Data/Entities/RefreshToken.cs`:**

```csharp
public class RefreshToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    // Store the SHA-256 hash, never the token itself. Same reasoning as passwords:
    // a database leak must not hand the attacker a set of live sessions.
    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }

    // Set when this token is rotated out. Turns the tokens into a chain,
    // which is what makes reuse detection possible.
    public int? ReplacedByTokenId { get; set; }

    public bool IsActive => RevokedAt is null && DateTime.UtcNow < ExpiresAt;
}
```

Config: unique index on `TokenHash`, index on `UserId`, cascade delete from `User`.
**No query filter on this entity** — it is looked up *before* a user is authenticated.

Migration: `dotnet ef migrations add AddRefreshTokens`.

Unlike a password, hash this with plain SHA-256, not `PasswordHasher`. A refresh token is
already 256 bits of cryptographic randomness (`RandomNumberGenerator.GetBytes(32)`), so it
needs no salt and no slow KDF — and it must be looked up *by hash* on every refresh, which
a per-row salted hash makes impossible.

### B3. Endpoints

`POST /api/auth/login` now returns `{ accessToken, expiresAt, refreshToken }`.

**New file — `Features/Auth/RefreshToken.cs` → `POST /api/auth/refresh`:**

```text
1. Hash the presented token, look it up.
2. Not found                → 401
3. Found but NOT active     → REUSE DETECTED (see below)
4. Active                   → rotate:
     - set RevokedAt on the old row
     - create a new refresh token row
     - set old.ReplacedByTokenId = new.Id
     - issue a new access token
     - return both
```

**Rotation** means the old refresh token dies the moment it is used. Each refresh token is
single-use.

**Reuse detection** — the payoff. If an already-revoked token is presented, either the user
replayed an old token or an attacker stole one and you are seeing the second use. You cannot
tell which, so assume the worst: **walk `ReplacedByTokenId` to the end of the chain and
revoke the whole family**, forcing a real login. That is why the chain field exists.

**New file — `Features/Auth/Logout.cs` → `POST /api/auth/logout`** — revoke the presented
refresh token. The access token still works until it expires; that is the honest tradeoff
of stateless tokens, and shortening the access lifetime to 15 minutes is how you bound it.

### B4. Client changes

`api.ts` gets a 401 interceptor: on 401, call `/api/auth/refresh` once, retry the original
request, and only bounce to login if the refresh itself fails.

**Single-flight it.** If five requests 401 at once and each fires its own refresh, the first
one rotates the token and the other four present a now-revoked token — which your own reuse
detection reads as a breach and logs the user out. Hold one shared in-flight refresh promise
and have every caller await it.

### B5. Check

Extend `TaskTracker.Api.http`: login → refresh → confirm the old refresh token is now
rejected → confirm that presenting it a second time revokes the new one too.

---

### What Path 3 leaves for later

- Email verification and password reset (needs an email sender — Path 4 territory).
- Roles / admin (`.RequireAuthorization(policy)` and role claims) — add when there is an
  actual admin feature to protect.
- Organizations / teams. `OwnerId` becomes `TenantId` plus a membership table. The
  `ICurrentUser` + query-filter layer built here is exactly the seam that swap goes
  through, which is why it was worth building even for a single-user model.

---

### Path 4: Background Processing & Async Jobs

- **Feature: Background Service for Overdue Notifications / Cleanup**
  - **What you'll learn**:
    - Implementing `BackgroundService` / `IHostedService`.
    - Working with `PeriodicTimer` in .NET.
    - **Service Lifetimes in practice**: Safely resolving scoped services (like `AppDbContext`) inside a singleton background worker using `IServiceScopeFactory`.
    - _(After Path 3: the worker has no HTTP request, so `ICurrentUser.Id` is null and the global query filters hide everything — `IgnoreQueryFilters()` is the fix.)_

---

### Path 5: Caching & Performance

- **Feature: Task Statistics & Output Caching**
  - **What you'll learn**:
    - Endpoint `GET /api/tasks/stats` (counts of total, completed, pending, overdue).
    - ASP.NET Core **Output Caching** middleware (`app.UseOutputCache()`).
    - Cache eviction / invalidation using cache tags when tasks are created/updated/deleted.
    - _(After Path 3: the cache key must include the user id, or one user gets served another's stats.)_

---

### Path 6: Connect the Frontend (Client Integration)

- **Feature: Wire up the React + Vite Client in `client/TaskTracker`**
  - **What you'll learn**:
    - Consuming the REST API endpoints, pagination, and sorting from the UI.
    - Gracefully handling validation errors and `ProblemDetails` returned by your global exception handler.

---

### Where should we start?

**Path 3 Phase A is the agreed next step.** Work through A1 → A7 in order; the B→A
enforcement detour in A4 is deliberate, do not skip it. Phase B only after the A6 check
passes.
