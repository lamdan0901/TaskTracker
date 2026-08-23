using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data;

namespace TaskTracker.Api.Features.Tags;

public sealed record TagResponse(int Id, string Name, int TaskCount, DateTime CreatedAt);

public static class ListTags
{
  public static void Map(IEndpointRouteBuilder app) => app.MapGet("/api/tags", Handle);

  private static async Task<IResult> Handle(AppDbContext db, CancellationToken ct)
  {
    var tags = await db.Tags
    .AsNoTracking()
    .OrderBy(t => t.Name)
    .Select(t => new TagResponse(
      t.Id, t.Name, t.Tasks.Count(), t.CreatedAt
    ))
    .ToListAsync(ct);

    return Results.Ok(tags);
  }

}