using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data;
namespace TaskTracker.Api.Features.Tags;

public static class DeleteTag
{
  public static void Map(IEndpointRouteBuilder app) => app.MapDelete("/api/tags/{id:int}", Handle);

  public static async Task<IResult> Handle(int id, AppDbContext db, CancellationToken ct)
  {
    var affected = await db.Tags.Where(t => t.Id == id).ExecuteDeleteAsync(ct);
    return affected == 0 ? Results.NotFound() : Results.NoContent();
  }
}