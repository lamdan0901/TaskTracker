namespace TaskTracker.Api.Features.Auth;

public static class AuthEndpoints
{
  public static void MapAuthEndpoints(this WebApplication app)
  {
    RegisterUser.Map(app);
    LoginUser.Map(app);
    RefreshTokenEndpoint.Map(app);
    LogoutUser.Map(app);
    Me.Map(app);
  }
}