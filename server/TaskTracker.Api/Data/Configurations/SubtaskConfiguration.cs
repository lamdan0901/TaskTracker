using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Data.Configurations;

public class SubtaskConfiguration : IEntityTypeConfiguration<Subtask>
{
  public void Configure(EntityTypeBuilder<Subtask> builder)
  {
    // Property constraints
    builder.Property(s => s.Title)
        .HasMaxLength(200)
        .IsRequired();

    // Indexes for performance (frequently querying subtasks by task and status)
    builder.HasIndex(s => s.TaskId);
    builder.HasIndex(s => s.IsDone);

    // 1:N Relationship: Subtask (Many) -> TaskItem (One)
    // When the parent TaskItem is deleted, delete all child subtasks automatically
    builder.HasOne(s => s.Task)
        .WithMany(t => t.Subtasks)
        .HasForeignKey(s => s.TaskId)
        .OnDelete(DeleteBehavior.Cascade);
  }
}
