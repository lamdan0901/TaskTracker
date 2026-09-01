namespace TaskTracker.Api.Features.Categories;

public static class CategoryEndpoints
{
  public static void MapCategoryEndpoints(this WebApplication app)
  {
    var group = app.MapGroup("").RequireAuthorization();

    ListCategories.Map(group);
    CreateCategory.Map(group);
    DeleteCategory.Map(group);
  }
}