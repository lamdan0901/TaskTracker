using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data;

namespace TaskTracker.Api.Features.Categories;

public sealed record CategoryResponse(
  int Id, string Name, int TaskCount, DateTime CreatedAt
);

public static class ListCategories
{
  public static void Map(IEndpointRouteBuilder app) => app.MapGet("/api/categories", Handle);

  private static async Task<IResult> Handle(AppDbContext db, CancellationToken ct)
  {
    var categories = await db.Categories
    .AsNoTracking()
    .OrderBy(c => c.Name)
    .Select(c => new CategoryResponse(c.Id, c.Name, c.Tasks.Count(), c.CreatedAt))
    .ToListAsync(ct);

    // c.Tasks.Count() translated directly into a SQL COUNT subquery! It doesn't load all tasks into memory.

    return Results.Ok(categories);
  }
}