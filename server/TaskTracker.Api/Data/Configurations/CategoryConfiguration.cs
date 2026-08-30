using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Data.Configurations;

public class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
  public void Configure(EntityTypeBuilder<Category> builder)
  {
    builder.Property(c => c.Name)
        .HasMaxLength(50)
        .UseCollation("NOCASE")
        .IsRequired();

    builder.HasIndex(c => new { c.Name, c.OwnerId })
        .IsUnique();

    builder.HasOne(c => c.Owner)
        .WithMany(u => u.Categories)
        .HasForeignKey(c => c.OwnerId)
        .OnDelete(DeleteBehavior.Cascade);
  }
}
