using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data;

namespace TaskTracker.Api.Features.Tasks;

public sealed record CategorySummaryDto(int Id, string Name);

public sealed record TaskResponse(int Id, string Title, bool IsDone, DateTime CreatedAt, int? CategoryId, CategorySummaryDto? Category);

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
            t.Id, t.Title, t.IsDone, t.CreatedAt, t.CategoryId,
            t.Category == null ? null : new CategorySummaryDto(t.Category.Id, t.Category.Name)
        ))
        .FirstOrDefaultAsync(ct);

        return task is not null ? Results.Ok(task) : Results.NotFound();
    }
}
