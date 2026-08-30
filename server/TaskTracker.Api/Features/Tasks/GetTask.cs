using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Common;
using TaskTracker.Api.Data;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Features.Tasks;

public sealed record CategorySummaryDto(int Id, string Name);
public sealed record TagSummaryDto(int Id, string Name);
public sealed record SubtaskSummaryDto(int Id, string Title, bool IsDone, DateTime CreatedAt);
public sealed record TaskResponse(int Id, string Title, bool IsDone, Priority Priority, DateOnly? DueDate, DateTime CreatedAt, int? CategoryId, CategorySummaryDto? Category, List<TagSummaryDto> Tags, List<SubtaskSummaryDto> Subtasks);

public static class GetTask
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/api/tasks/{id:int}", Handle);

    private static async Task<IResult> Handle(int id, AppDbContext db, CancellationToken ct)
    {
        var task = await db.Tasks
        .AsNoTracking()
        .Where(t => t.Id == id)
        .Select(t => new TaskResponse(
            t.Id, t.Title, t.IsDone, t.Priority, t.DueDate, t.CreatedAt, t.CategoryId,
            t.Category == null ? null : new CategorySummaryDto(t.Category.Id, t.Category.Name),
            t.Tags.OrderBy(t => t.Name).Select(t => new TagSummaryDto(t.Id, t.Name)).ToList(),
            t.Subtasks.OrderBy(s => s.CreatedAt).Select(s => new SubtaskSummaryDto(s.Id, s.Title, s.IsDone, s.CreatedAt)).ToList()
        ))
        .FirstOrDefaultAsync(ct);

        return task is not null ? Results.Ok(task) : Results.NotFound();
    }
}
