namespace TaskTracker.Api.Features.Tags;

public static class TagEndpoints
{
  public static void MapTagEndpoints(this WebApplication app)
  {
    var group = app.MapGroup("").RequireAuthorization();

    ListTags.Map(group);
    CreateTag.Map(group);
    DeleteTag.Map(group);
  }
}