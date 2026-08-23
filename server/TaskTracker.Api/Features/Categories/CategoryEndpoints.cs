namespace TaskTracker.Api.Features.Categories;

public static class CategoryEndpoints
{
  public static void MapCategoryEndpoints(this WebApplication app)
  {
    ListCategories.Map(app);
    CreateCategory.Map(app);
    DeleteCategory.Map(app);
  }
}