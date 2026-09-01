using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Data.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
  public void Configure(EntityTypeBuilder<RefreshToken> builder)
  {
    builder.Property(r => r.TokenHash)
        .IsRequired()
        .HasMaxLength(128);

    builder.HasIndex(r => r.TokenHash).IsUnique();
    builder.HasIndex(r => r.UserId);

    builder.HasOne(r => r.User)
        .WithMany()
        .HasForeignKey(r => r.UserId)
        .OnDelete(DeleteBehavior.Cascade);
  }
}
