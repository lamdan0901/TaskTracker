using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace TaskTracker.Api.Features.Auth;

public static class Me
{
  public static void Map(IEndpointRouteBuilder app) =>
    app.MapGet("/api/auth/me", Handle).RequireAuthorization();

  // ClaimsPrincipal user is injected by the framework — it is built by
  // UseAuthentication from the validated JWT. No database needed: that is
  // the whole point of putting claims in the token.
  private static IResult Handle(ClaimsPrincipal user)
  {
    var idStr = user.FindFirstValue(JwtRegisteredClaimNames.Sub)
             ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
    var email = user.FindFirstValue(JwtRegisteredClaimNames.Email)
             ?? user.FindFirstValue(ClaimTypes.Email);

    if (!int.TryParse(idStr, out var id))
    {
      return Results.Unauthorized();
    }

    return Results.Ok(new { Id = id, Email = email });
  }
}