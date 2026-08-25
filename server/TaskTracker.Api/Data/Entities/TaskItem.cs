namespace TaskTracker.Api.Data.Entities;

public class TaskItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool IsDone { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Priority Priority { get; set; } = Priority.Medium;

    // Foreign Key: nullable int? means a task can be uncategorized
    public int? CategoryId { get; set; }

    // Ref Navigation Properties
    public Category? Category { get; set; }

    public List<Tag> Tags { get; set; } = [];

    public List<Subtask> Subtasks { get; set; } = [];
}
