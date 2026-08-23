using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Data.Configurations;

public class TaskItemConfiguration : IEntityTypeConfiguration<TaskItem>
{
  public void Configure(EntityTypeBuilder<TaskItem> builder)
  {
    // Property rules
    builder.Property(t => t.Title)
        .HasMaxLength(200)
        .IsRequired();
    // Indexes
    builder.HasIndex(t => t.CreatedAt);
    builder.HasIndex(t => t.IsDone);
    builder.HasIndex(t => t.CategoryId);
    // Relationship: TaskItem (Many) -> Category (One)
    builder.HasOne(t => t.Category)
        .WithMany(c => c.Tasks)
        .HasForeignKey(t => t.CategoryId)
        .OnDelete(DeleteBehavior.SetNull);
  }
}
