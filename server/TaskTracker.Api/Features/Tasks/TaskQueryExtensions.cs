using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Features.Tasks;

public static class TaskQueryExtensions
{
    public static IQueryable<TaskItem> ApplySearch(this IQueryable<TaskItem> query, string? search)
    {
        if (string.IsNullOrWhiteSpace(search))
            return query;

        var escaped = search
            .Replace("\\", "\\\\")
            .Replace("%", "\\%")
            .Replace("_", "\\_");

        return query.Where(t => EF.Functions.Like(t.Title, $"%{escaped}%", "\\"));
    }

    public static IQueryable<TaskItem> ApplyStatusFilter(this IQueryable<TaskItem> query, bool? isDone)
    {
        return isDone is bool done ? query.Where(t => t.IsDone == done) : query;
    }

    public static IQueryable<TaskItem> ApplyCategoryFilter(this IQueryable<TaskItem> query, int? categoryId)
    {
        return categoryId is int id ? query.Where(t => t.CategoryId == id) : query;
    }

    public static IQueryable<TaskItem> ApplyPriorityFilter(this IQueryable<TaskItem> query, Priority? priority)
    {
        return priority is Priority p ? query.Where(t => t.Priority == p) : query;
    }

    public static IQueryable<TaskItem> ApplyTagFilters(
        this IQueryable<TaskItem> query,
        int[]? tagIds,
        string[]? tagNames)
    {
        // Pattern match: check if array is not null and has at least one element
        if (tagIds is { Length: > 0 })
        {
            query = query.Where(t => t.Tags.Any(tag => tagIds.Contains(tag.Id)));
        }

        if (tagNames is { Length: > 0 })
        {
            query = query.Where(t => t.Tags.Any(tag => tagNames.Contains(tag.Name)));
        }

        return query;
    }

    public static IQueryable<TaskItem> ApplyDueDateFilters(
        this IQueryable<TaskItem> query,
        DateOnly? dueDate,
        DateOnly? dueBefore,
        DateOnly? dueAfter,
        bool? isOverdue)
    {
        if (dueDate is DateOnly exactDue)
            query = query.Where(t => t.DueDate == exactDue);

        if (dueBefore is DateOnly before)
            query = query.Where(t => t.DueDate != null && t.DueDate <= before);

        if (dueAfter is DateOnly after)
            query = query.Where(t => t.DueDate != null && t.DueDate >= after);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (isOverdue is true)
            query = query.Where(t => !t.IsDone && t.DueDate != null && t.DueDate < today);
        else if (isOverdue is false)
            query = query.Where(t => t.IsDone || t.DueDate == null || t.DueDate >= today);

        return query;
    }

    public static IQueryable<TaskItem> ApplySorting(this IQueryable<TaskItem> query, string sortBy, string sortDir)
    {
        var desc = sortDir == "desc";

        IOrderedQueryable<TaskItem> ordered = sortBy switch
        {
            "title" => desc ? query.OrderByDescending(t => t.Title) : query.OrderBy(t => t.Title),
            "isDone" => desc ? query.OrderByDescending(t => t.IsDone) : query.OrderBy(t => t.IsDone),
            "priority" => desc ? query.OrderByDescending(t => t.Priority) : query.OrderBy(t => t.Priority),
            "dueDate" => desc
                ? query.OrderByDescending(t => t.DueDate.HasValue).ThenByDescending(t => t.DueDate)
                : query.OrderByDescending(t => t.DueDate.HasValue).ThenBy(t => t.DueDate),
            _ => desc ? query.OrderByDescending(t => t.CreatedAt) : query.OrderBy(t => t.CreatedAt),
        };

        // Deterministic tiebreaker on primary key
        return ordered.ThenBy(t => t.Id);
    }

    public static IQueryable<TaskItem> ApplyPaging(this IQueryable<TaskItem> query, int pageIndex, int pageSize)
    {
        return query.Skip(pageIndex * pageSize).Take(pageSize);
    }
}
