using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Common;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUser currentUser) : DbContext(options)
{
  // EF calls this once, at startup, while building its model of your schema.
  // Everything configured here feeds both the migration generator and the
  // SQL translator. This is where mapping config belongs — not in the routes
  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    // Always call base first: it runs conventions and any provider config.
    base.OnModelCreating(modelBuilder);

    // This one line will automatically discover and run any configs in Configurations folder
    modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

    // Applied to EVERY LINQ query against these entities, including
    // navigations loaded through .Include().
    // Compare against currentUser.Id (nullable) — at design time it is null
    // and the filter matches nothing, which is the safe direction.
    modelBuilder.Entity<TaskItem>().HasQueryFilter(t => t.OwnerId == currentUser.Id);
    modelBuilder.Entity<Category>().HasQueryFilter(c => c.OwnerId == currentUser.Id);
    modelBuilder.Entity<Tag>().HasQueryFilter(t => t.OwnerId == currentUser.Id);
  }

  public DbSet<TaskItem> Tasks => Set<TaskItem>();
  public DbSet<Category> Categories => Set<Category>();
  public DbSet<Tag> Tags => Set<Tag>();
  public DbSet<Subtask> Subtasks => Set<Subtask>();
  public DbSet<User> Users => Set<User>();
}