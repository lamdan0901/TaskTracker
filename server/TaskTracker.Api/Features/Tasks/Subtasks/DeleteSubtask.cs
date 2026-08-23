using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data;

namespace TaskTracker.Api.Features.Tasks.Subtasks;

public static class DeleteSubtask
{
  public static void Map(IEndpointRouteBuilder app) =>
      app.MapDelete("/api/tasks/{taskId:int}/subtasks/{subtaskId:int}", Handle);

  private static async Task<IResult> Handle(
      int taskId,
      int subtaskId,
      AppDbContext db,
      CancellationToken ct)
  {
    var rowsDeleted = await db.Subtasks
        .Where(s => s.Id == subtaskId && s.TaskId == taskId)
        .ExecuteDeleteAsync(ct);

    return rowsDeleted == 0 ? Results.NotFound() : Results.NoContent();
  }
}
