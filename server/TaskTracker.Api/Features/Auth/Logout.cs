using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data;

namespace TaskTracker.Api.Features.Auth;

public sealed record LogoutRequest(
    [property: Required(AllowEmptyStrings = false)] string RefreshToken
);

public static class LogoutUser
{
  public static void Map(IEndpointRouteBuilder app) =>
      app.MapPost("/api/auth/logout", Handle);

  private static async Task<IResult> Handle(
      LogoutRequest req,
      AppDbContext db,
      CancellationToken ct)
  {
    var tokenHash = TokenService.HashToken(req.RefreshToken);

    var token = await db.RefreshTokens
        .FirstOrDefaultAsync(r => r.TokenHash == tokenHash, ct);

    if (token is not null && token.RevokedAt is null)
    {
      token.RevokedAt = DateTime.UtcNow;
      await db.SaveChangesAsync(ct);
    }

    return Results.NoContent();
  }
}
