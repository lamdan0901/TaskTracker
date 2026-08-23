using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Features.Tasks.Subtasks;

public sealed record SubtaskCreateRequest(
  [Required(AllowEmptyStrings =false, ErrorMessage = "Title is required")]
  [MaxLength(200)]
  string Title
);

public static class CreateSubtask
{
  public static void Map(IEndpointRouteBuilder app) => app.MapPost("/api/tasks/{taskId:int}/subtasks", Handle);

  private static async Task<IResult> Handle(int taskId, SubtaskCreateRequest req, AppDbContext db, CancellationToken ct)
  {
    var taskExists = await db.Tasks.AnyAsync(t => t.Id == taskId, ct);
    if (!taskExists)
    {
      return Results.NotFound();
    }

    var subtask = new Subtask
    {
      Title = req.Title,
      TaskId = taskId
    };

    db.Subtasks.Add(subtask);
    await db.SaveChangesAsync(ct);

    var response = new SubtaskResponse(
      subtask.Id,
      subtask.Title,
      subtask.IsDone,
      subtask.CreatedAt,
      subtask.TaskId
    );

    return Results.Created($"/api/tasks/{taskId}/subtasks/{subtask.Id}", response);
  }
}