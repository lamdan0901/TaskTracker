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

    // ASP.NET Core binds repeated query parameters (e.g. ?tagIds=1&tagIds=2 or ?tagIds=1) directly into arrays
    public int[]? TagIds { get; init; }
    public string[]? TagNames { get; init; }

    public Priority? Priority { get; init; }
    public DateOnly? DueDate { get; init; }
    public DateOnly? DueBefore { get; init; }
    public DateOnly? DueAfter { get; init; }
    public bool? IsOverdue { get; init; }

    // AllowedValues (.NET 8+) replaces the hand-rolled switch this record used to
    // carry in Validate(). Every one of these attributes treats null as "not
    // supplied" and passes it, which is exactly what optional query params need.
    [AllowedValues(null, "title", "createdAt", "isDone", "priority", "dueDate")]
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
        // 1. Start base unexecuted query (AsNoTracking for read-only performance)
        var query = db.Tasks.AsNoTracking();

        // 2. Text Search
        query = query.ApplySearch(q.Search);

        // 3. Status, Category, Priority Filters
        query = query.ApplyStatusFilter(q.IsDone);
        query = query.ApplyCategoryFilter(q.CategoryId);
        query = query.ApplyPriorityFilter(q.Priority);

        // 4. Multi-tag Filters (Ids & Names)
        query = query.ApplyTagFilters(q.TagIds, q.TagNames);

        // 5. Timeline / Due Date Filters
        query = query.ApplyDueDateFilters(q.DueDate, q.DueBefore, q.DueAfter, q.IsOverdue);

        // 6. Total Count of filtered records before paging
        var totalCount = await query.CountAsync(ct);

        // 7. Deterministic Sorting & Pagination
        query = query.ApplySorting(q.SortByOrDefault, q.SortDirOrDefault);
        query = query.ApplyPaging(q.PageIndexOrDefault, q.PageSizeOrDefault);

        // 8. Projection & Execution
        var items = await query
            .Select(t => new TaskResponse(
                t.Id,
                t.Title,
                t.IsDone,
                t.Priority,
                t.DueDate,
                t.CreatedAt,
                t.CategoryId,
                t.Category == null ? null : new CategorySummaryDto(t.Category.Id, t.Category.Name),
                t.Tags.OrderBy(tag => tag.Name).Select(tag => new TagSummaryDto(tag.Id, tag.Name)).ToList(),
                t.Subtasks.OrderBy(s => s.CreatedAt).Select(s => new SubtaskSummaryDto(s.Id, s.Title, s.IsDone, s.CreatedAt)).ToList()
            ))
            .ToListAsync(ct);

        return Results.Ok(new PagedResult<TaskResponse>(items, totalCount, q.PageIndexOrDefault, q.PageSizeOrDefault));
    }
}
