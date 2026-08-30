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
  public int? Id =>
    int.TryParse(accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier),
    out var id) ? id : null;

  public int RequireId() => Id ?? throw new InvalidOperationException("No authenticated user on this request.");
}