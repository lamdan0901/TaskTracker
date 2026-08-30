using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Features.Auth;

public sealed record LoginRequest(
  [property: EmailAddress, Required] string Email,
  [property: Required, MinLength(8)] string Password
);

public sealed class LoginUser
{
  public static void Map(IEndpointRouteBuilder app) => app.MapPost("/api/auth/login", Handle);

  private static async Task<IResult> Handle(
    LoginRequest req,
    AppDbContext db,
    TokenService tokens, // DI: same instance config that Program.cs registered
    CancellationToken ct)
  {
    var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email, ct);
    if (user is null) return Results.Unauthorized();

    var result = new PasswordHasher<User>().VerifyHashedPassword(user, user.PasswordHash, req.Password);
    if (result == PasswordVerificationResult.Failed) return Results.Unauthorized();

    var (token, expiresAt) = tokens.CreateAccessToken(user);
    return Results.Ok(new { user.Id, user.Email, token, expiresAt });
  }
}