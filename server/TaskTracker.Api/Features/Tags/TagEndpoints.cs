namespace TaskTracker.Api.Features.Tags;

public static class TagEndpoints
{
  public static void MapTagEndpoints(this WebApplication app)
  {
    ListTags.Map(app);
    CreateTag.Map(app);
    DeleteTag.Map(app);
  }
}