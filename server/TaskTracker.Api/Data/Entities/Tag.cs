namespace TaskTracker.Api.Data.Entities;

public class Tag
{
  public int Id { get; set; }
  public string Name { get; set; } = string.Empty;
  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

  public List<TaskItem> Tasks { get; set; } = [];

  public int OwnerId { get; set; }
  public User Owner { get; set; } = null!;
}
