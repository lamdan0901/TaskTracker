namespace TaskTracker.Api.Data.Entities;

public class Subtask
{
  public int Id { get; set; }
  public string Title { get; set; } = string.Empty;
  public bool IsDone { get; set; }
  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

  // Foreign Key: required (non-nullable int), because a subtask cannot exist without a task
  public int TaskId { get; set; }

  // Reference Navigation Property: points to parent task
  public TaskItem Task { get; set; } = null!;
}
