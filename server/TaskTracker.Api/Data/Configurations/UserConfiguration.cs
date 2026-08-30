using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
  public void Configure(EntityTypeBuilder<User> builder)
  {
    builder.Property(u => u.Email)
    .HasMaxLength(256)
    .UseCollation("NOCASE")
    .IsRequired();
    builder.HasIndex(u => u.Email).IsUnique();
    builder.Property(u => u.PasswordHash).IsRequired();
  }
}