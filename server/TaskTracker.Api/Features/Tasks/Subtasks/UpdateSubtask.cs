using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data;

namespace TaskTracker.Api.Features.Tasks.Subtasks;

public sealed record SubtaskUpdateRequest(
    [MaxLength(200)] string? Title,
    bool? IsDone
) : IValidatableObject
{
  public IEnumerable<ValidationResult> Validate(ValidationContext ctx)
  {
    if ((Title, IsDone) is (null, null))
      yield return new ValidationResult("At least one field must be provided.");
    if (Title is not null && string.IsNullOrWhiteSpace(Title))
      yield return new ValidationResult("Title cannot be blank when provided.", [nameof(Title)]);
  }
}


public static class UpdateSubtask
{
  public static void Map(IEndpointRouteBuilder app) =>
      app.MapPut("/api/tasks/{taskId:int}/subtasks/{subtaskId:int}", Handle);

  private static async Task<IResult> Handle(int taskId, int subtaskId, SubtaskUpdateRequest req, AppDbContext db, CancellationToken ct)
  {
    var subtask = await db.Subtasks.FirstOrDefaultAsync(s => s.Id == subtaskId && s.TaskId == taskId, ct);
    if (subtask is null) return Results.NotFound();

    if (req.Title is not null) subtask.Title = req.Title.Trim();
    if (req.IsDone is not null) subtask.IsDone = req.IsDone.Value;

    await db.SaveChangesAsync(ct);
    return Results.NoContent();
  }

}