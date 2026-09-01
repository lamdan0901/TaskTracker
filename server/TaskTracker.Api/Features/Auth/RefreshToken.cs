using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Features.Auth;

public sealed record RefreshTokenRequest(
  [property: Required(AllowEmptyStrings = false)] string RefreshToken
);

public static class RefreshTokenEndpoint
{
  public static void Map(IEndpointRouteBuilder app) => app.MapPost("/api/auth/refresh", Handle);

  public static async Task<IResult> Handle(
    RefreshTokenRequest req,
    AppDbContext db,
    TokenService tokens,
    CancellationToken ct
  )
  {
    var tokenHash = TokenService.HashToken(req.RefreshToken);
    var existingToken = await db.RefreshTokens
      .Include(r => r.User)
      .FirstOrDefaultAsync(r => r.TokenHash == tokenHash, ct);

    if (existingToken is null) return Results.Unauthorized();

    if (!existingToken.IsActive)
    {
      // If already revoked (someone replayed an old token), walk the chain and revoke all descendants
      if (existingToken.RevokedAt is not null)
      {
        await RevokeDescendantChainAsync(db, existingToken, ct);
      }
      return Results.Unauthorized();
    }

    existingToken.RevokedAt = DateTime.UtcNow;

    var (newRawToken, newHash, newExpiresAt) = tokens.CreateRefreshToken();
    var newRefreshToken = new RefreshToken
    {
      UserId = existingToken.UserId,
      TokenHash = newHash,
      ExpiresAt = newExpiresAt,
      CreatedAt = DateTime.UtcNow
    };

    db.RefreshTokens.Add(newRefreshToken);
    await db.SaveChangesAsync(ct);

    existingToken.ReplacedByTokenId = newRefreshToken.Id;
    await db.SaveChangesAsync(ct);

    var (accessToken, expiresAt) = tokens.CreateAccessToken(existingToken.User);
    return Results.Ok(new
    {
      accessToken,
      expiresAt,
      refreshToken = newRawToken
    });
  }


  /// <summary>
  /// Walks down the ReplacedByTokenId chain to revoke any active tokens issued after this one.
  /// </summary>
  private static async Task RevokeDescendantChainAsync(
     AppDbContext db,
     RefreshToken token,
     CancellationToken ct)
  {
    var current = token;
    while (current.ReplacedByTokenId is not null)
    {
      var next = await db.RefreshTokens
        .FirstOrDefaultAsync(r => r.Id == current.ReplacedByTokenId, ct);
      if (next is null) break;

      next.RevokedAt ??= DateTime.UtcNow; // this means if RevokedAt is null then assign a value to it.
      current = next;
    }

    await db.SaveChangesAsync(ct);
  }
}