using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Common;
using TaskTracker.Api.Data;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Features.Tasks;

/// <summary>
/// Lives in this file because it is meaningless outside ListTasks. Peers get their
/// own file; children share their parent's.
/// </summary>
public sealed record TaskQueryRequest
{
    [MaxLength(100)]
    public string? Search { get; init; }
    public bool? IsDone { get; init; }
    public int? CategoryId { get; init; }
    public int? TagId { get; init; }
    public string? Tag { get; init; }

    // AllowedValues (.NET 8+) replaces the hand-rolled switch this record used to
    // carry in Validate(). Every one of these attributes treats null as "not
    // supplied" and passes it, which is exactly what optional query params need.
    [AllowedValues(null, "title", "createdAt", "isDone")]
    public string? SortBy { get; init; }

    [AllowedValues(null, "asc", "desc")]
    public string? SortDir { get; init; }

    [Range(0, int.MaxValue)]
    public int? PageIndex { get; init; }

    [Range(1, 100)]
    public int? PageSize { get; init; }

    // Defaults live here so the handler and the validator can't disagree.
    public string SortByOrDefault => SortBy ?? "createdAt";
    public string SortDirOrDefault => SortDir ?? "desc";
    public int PageIndexOrDefault => PageIndex ?? 0;
    public int PageSizeOrDefault => PageSize ?? 5;
}

public static class ListTasks
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/api/tasks", Handle);

    private static async Task<IResult> Handle(
        AppDbContext db,
        [AsParameters] TaskQueryRequest q,
        CancellationToken ct)
    {
        // 1. No validation guard here any more. AddValidation() runs an endpoint
        //    filter before this method, so bad input never reaches the handler.

        // 2. Start an unexecuted query. Nothing hits SQLite until CountAsync /
        //    ToListAsync below — until then we're only building an expression tree.
        //    AsNoTracking is a performance optimization for read-only queries instead of the default tracked queries that EF uses for updates.
        var query = db.Tasks.AsNoTracking();

        // 3. Filter: search. EF translates Contains() to instr(), which is byte-comparison
        //    and ignores collation. LIKE is case-insensitive for ASCII in SQLite by default,
        //    so ask for LIKE explicitly.
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            // Escape LIKE wildcards in user input, or a search for "50%" matches every row.
            // Backslash first — otherwise it re-escapes the backslashes added below.
            var escaped = q.Search
                .Replace("\\", "\\\\")
                .Replace("%", "\\%")
                .Replace("_", "\\_");

            query = query.Where(t => EF.Functions.Like(t.Title, $"%{escaped}%", "\\"));
        }

        // 4. Filter: isDone. `is bool isDone` unwraps the nullable once so the
        //    predicate compares plain bools — EF translates that cleanly.
        //    Absent (null) means "don't filter", not "filter by false".
        if (q.IsDone is bool isDone)
            query = query.Where(t => t.IsDone == isDone);

        // Filter by categoryId if any
        if (q.CategoryId is int categoryId) query = query.Where(t => t.CategoryId == categoryId);

        // Filter by tagid if provided
        if (q.TagId is int tagId) query = query.Where(t => t.Tags.Any(tag => tag.Id == tagId));

        // Filter by tagname if provided
        if (!string.IsNullOrWhiteSpace(q.Tag)) query = query.Where(t => t.Tags.Any(tag => tag.Name == q.Tag));

        // 5. Count the filtered set BEFORE paging, so totalCount tells the client
        //    how many rows match their filters — not how many are on this page.
        //    This is a separate round-trip (SELECT COUNT(*)) against the same filters.
        var totalCount = await query.CountAsync(ct);

        // 6. Sort. EF can't take a property name as a string, so a switch maps the
        //    allowed values to real key selectors — which also means an attacker
        //    can't inject a column name. Assigning back into `query` keeps all
        //    three arms the same type even though OrderBy returns IOrderedQueryable.
        //    Keep this switch even though AllowedValues now rejects unknown values:
        //    the attribute is the validator, this is the injection-safe allowlist.
        var desc = q.SortDirOrDefault == "desc";

        // Declare as IOrderedQueryable, not var. OrderBy/OrderByDescending both return
        // IOrderedQueryable<T>, and that's the type that exposes ThenBy — plain
        // IQueryable<T> does not. Naming the type here is what makes step 6b legal
        IOrderedQueryable<TaskItem> orderedQuery = q.SortByOrDefault switch
        {
            "title" => desc ? query.OrderByDescending(t => t.Title) : query.OrderBy(t => t.Title),
            "isDone" => desc ? query.OrderByDescending(t => t.IsDone) : query.OrderBy(t => t.IsDone),
            _ => desc ? query.OrderByDescending(t => t.CreatedAt) : query.OrderBy(t => t.CreatedAt),
        };

        // 6b. Tiebreaker on the primary key. Id is unique, so no two rows can now compare
        //     equal — the sort becomes a deterministic total order and paging is repeatable.
        //     OrderBy sets the primary sort key. ThenBy adds a secondary key, used only to break ties in the first.
        query = orderedQuery.ThenBy(t => t.Id);

        // 7. Page and execute. Skip/Take must come after the sort or the slice is
        //    arbitrary. ToListAsync is where the whole composed tree finally runs
        //    as one SQL statement.
        var pageIndex = q.PageIndexOrDefault;
        var pageSize = q.PageSizeOrDefault;
        var items = await query
        .Skip(pageIndex * pageSize)
        .Take(pageSize)
        .Select(t => new TaskResponse(
            t.Id,
            t.Title,
            t.IsDone,
            t.CreatedAt,
            t.CategoryId,
            t.Category == null ? null : new CategorySummaryDto(t.Category.Id, t.Category.Name),
            t.Tags.OrderBy(tag => tag.Name).Select(tag => new TagSummaryDto(tag.Id, tag.Name)).ToList(),
            t.Subtasks.OrderBy(s => s.CreatedAt).Select(s => new SubtaskSummaryDto(s.Id, s.Title, s.IsDone, s.CreatedAt)).ToList()
        ))
        .ToListAsync(ct);

        // 8. Envelope: the page of rows plus the metadata the client needs to
        //    render pagination. Echo pageIndex/pageSize so the client sees the
        //    values actually applied, including the defaults it didn't send.
        return Results.Ok(new PagedResult<TaskResponse>(items, totalCount, pageIndex, pageSize));
    }
}
