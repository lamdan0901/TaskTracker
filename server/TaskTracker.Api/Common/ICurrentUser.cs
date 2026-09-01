using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace TaskTracker.Api.Common;

public interface ICurrentUser
{
  // Nullable on purpose. `dotnet ef migrations` builds the DbContext with no
  // HTTP request in flight — if this throws, your migrations stop working.
  int? Id { get; }
  int RequireId();
}

public sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
  public int? Id
  {
    get
    {
      var user = accessor.HttpContext?.User;
      if (user is null) return null;

      // When DefaultInboundClaimTypeMap is cleared, "sub" is not converted to ClaimTypes.NameIdentifier
      var subClaim = user.FindFirstValue(JwtRegisteredClaimNames.Sub)
                  ?? user.FindFirstValue(ClaimTypes.NameIdentifier);

      return int.TryParse(subClaim, out var id) ? id : null;
    }
  }

  public int RequireId() => Id ?? throw new InvalidOperationException("No authenticated user on this request.");
}