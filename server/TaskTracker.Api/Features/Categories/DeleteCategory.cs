using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data;

namespace TaskTracker.Api.Features.Categories;

public static class DeleteCategory
{
  public static void Map(IEndpointRouteBuilder app) => app.MapDelete("/api/categories/{id:int}", Handle);

  private static async Task<IResult> Handle(int id, AppDbContext db, CancellationToken ct)
  {
    var rowsDeleted = await db.Categories.Where(c => c.Id == id).ExecuteDeleteAsync(ct);
    return rowsDeleted == 0 ? Results.NotFound() : Results.NoContent();
  }
}