
using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data;
namespace TaskTracker.Api.Features.Tasks.Subtasks;

public static class ListSubtasks
{
  public static void Map(IEndpointRouteBuilder app) =>
      app.MapGet("/api/tasks/{taskId:int}/subtasks", Handle);

  private static async Task<IResult> Handle(int taskId, AppDbContext db, CancellationToken ct)
  {
    var taskExists = await db.Tasks.AnyAsync(t => t.Id == taskId, ct);
    if (!taskExists)
    {
      return Results.NotFound();
    }

    var subtasks = await db.Subtasks.AsNoTracking()
    .Where(s => s.TaskId == taskId)
    .OrderBy(s => s.CreatedAt)
    .Select(s => new SubtaskResponse(
      s.Id,
      s.Title,
      s.IsDone,
      s.CreatedAt,
      s.TaskId
    )).ToListAsync(ct);

    return Results.Ok(subtasks);
  }
}