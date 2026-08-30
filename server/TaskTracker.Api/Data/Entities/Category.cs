namespace TaskTracker.Api.Data.Entities;

public class Category
{
  public int Id { get; set; }
  public string Name { get; set; } = string.Empty;
  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
  // Collection Navigation Property: One Category has Many Tasks
  public List<TaskItem> Tasks { get; set; } = [];

  public int OwnerId { get; set; }
  public User Owner { get; set; } = null!;
}