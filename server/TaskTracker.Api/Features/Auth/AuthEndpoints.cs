namespace TaskTracker.Api.Features.Auth;

public static class AuthEndpoints
{
  public static void MapAuthEndpoints(this WebApplication app)
  {
    RegisterUser.Map(app);
    LoginUser.Map(app);
    Me.Map(app);
  }
}