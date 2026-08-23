using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Data;

public class AppDbContext : DbContext
{
  public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

  public DbSet<TaskItem> Tasks => Set<TaskItem>();
  public DbSet<Category> Categories => Set<Category>();

  public DbSet<Tag> Tags => Set<Tag>();

  // EF calls this once, at startup, while building its model of your schema.
  // Everything configured here feeds both the migration generator and the
  // SQL translator. This is where mapping config belongs — not in the routes
  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    // Always call base first: it runs conventions and any provider config.
    base.OnModelCreating(modelBuilder);

    // This one line will automatically discover and run any configs in Configurations folder
    modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
  }
}