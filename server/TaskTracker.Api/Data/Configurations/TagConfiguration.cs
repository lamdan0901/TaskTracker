using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Data.Configurations;

public class TagConfiguration : IEntityTypeConfiguration<Tag>
{
  public void Configure(EntityTypeBuilder<Tag> builder)
  {
    builder.Property(c => c.Name)
        .HasMaxLength(50)
        .UseCollation("NOCASE")
        .IsRequired();

    builder.HasIndex(c => c.Name)
        .IsUnique();
  }
}
