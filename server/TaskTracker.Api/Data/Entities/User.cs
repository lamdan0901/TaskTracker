namespace TaskTracker.Api.Data.Entities;

public class User
{
  public int Id { get; set; }
  public string Email { get; set; } = string.Empty;

  public string PasswordHash { get; set; } = string.Empty;
  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

  // Inverse navigations — optional, but they make cascade-delete intent explicit.
  public List<TaskItem> Tasks { get; set; } = [];
  public List<Category> Categories { get; set; } = [];
  public List<Tag> Tags { get; set; } = [];
}