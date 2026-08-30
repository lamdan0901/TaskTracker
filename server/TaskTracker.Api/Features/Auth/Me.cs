using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using TaskTracker.Api.Data;   // adjust/remove if unused

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
    // If we cleared the inbound map, "sub" arrives as "sub".
    // If we had NOT cleared it, it would arrive as ClaimTypes.NameIdentifier
    var id = user.FindFirstValue(JwtRegisteredClaimNames.Sub);
    var email = user.FindFirstValue(JwtRegisteredClaimNames.Email);

    return Results.Ok(new { Id = Guid.Parse(id!), Email = email });
  }
}