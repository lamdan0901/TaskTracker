namespace TaskTracker.Api.Data.Entities;

// Unlike a password, hash this with plain SHA-256, not PasswordHasher. A refresh token is already 256 bits of cryptographic randomness (RandomNumberGenerator.GetBytes(32)), so it needs no salt and no slow KDF — and it must be looked up by hash on every refresh, which a per-row salted hash makes impossible.
public class RefreshToken
{
  public int Id { get; set; }
  public int UserId { get; set; }
  public User User { get; set; } = null!;

  // Store the SHA-256 hash, never the token itself.
  public string TokenHash { get; set; } = string.Empty;

  public DateTime ExpiresAt { get; set; }
  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
  public DateTime? RevokedAt { get; set; }

  // Set when this token is rotated out. Turns the tokens into a chain,
  // which is what makes reuse detection possible.
  public int? ReplacedByTokenId { get; set; }
  public bool IsActive => RevokedAt is null && DateTime.UtcNow < ExpiresAt;
}