using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data;

namespace TaskTracker.Api.Features.Tasks;

public sealed record MarkAllRequest(bool IsDone);

public static class MarkAllTasks
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPut("/api/tasks/mark-all", Handle);

    private static async Task<IResult> Handle(
        MarkAllRequest req,
        AppDbContext db,
        CancellationToken ct)
    {
        // ExecuteUpdateAsync issues one UPDATE statement — no entities loaded,
        // no change tracker involved, and it does not call SaveChangesAsync.
        await db.Tasks.ExecuteUpdateAsync(t => t.SetProperty(x => x.IsDone, req.IsDone), ct);
        return Results.NoContent();
    }
}
