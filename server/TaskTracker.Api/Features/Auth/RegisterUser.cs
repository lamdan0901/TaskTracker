using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Features.Auth;

public sealed record RegisterRequest(
  [property: EmailAddress, Required] string Email,
  [property: Required, MinLength(8)] string Password
);

public static class RegisterUser
{
  public static void Map(IEndpointRouteBuilder app) => app.MapPost("/api/auth/register", Handle);

  private static async Task<IResult> Handle(RegisterRequest req, AppDbContext db, CancellationToken ct)
  {
    if (await db.Users.AnyAsync(u => u.Email == req.Email, ct))
      return Results.Conflict($"Email '{req.Email}' is already registered");

    var user = new User { Email = req.Email };
    // HashPassword generates a random salt internally and embeds it in the output string. That is why two identical passwords hash differently
    user.PasswordHash = new PasswordHasher<User>().HashPassword(user, req.Password);

    db.Users.Add(user);
    await db.SaveChangesAsync(ct);

    return Results.Created($"/api/users/{user.Id}", new { user.Id, user.Email });
  }
}