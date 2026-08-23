using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data;

namespace TaskTracker.Api.Features.Tasks;

public static class DeleteTask
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapDelete("/api/tasks/{id:int}", Handle);

    private static async Task<IResult> Handle(int id, AppDbContext db, CancellationToken ct)
    {
        var rowsDeleted = await db.Tasks
            .Where(t => t.Id == id)
            .ExecuteDeleteAsync(ct);
        return rowsDeleted == 0 ? Results.NotFound() : Results.NoContent();
    }
}
