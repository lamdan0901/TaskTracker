using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Common;
using TaskTracker.Api.Data;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Features.Tags;

public sealed record TagCreateRequest(
  [Required(AllowEmptyStrings = false, ErrorMessage = "Tag name is required.")]
  [MaxLength(50)]
  string Name
);

public static class CreateTag
{
  public static void Map(IEndpointRouteBuilder app) => app.MapPost("/api/tags", Handle);

  public static async Task<IResult> Handle(
    TagCreateRequest req,
    AppDbContext db,
    ICurrentUser currentUser,
    CancellationToken ct)
  {
    var trimmedName = req.Name.Trim();
    var exists = await db.Tags.AnyAsync(t => t.Name == trimmedName, ct);
    if (exists)
    {
      return Results.Conflict(new ProblemDetails
      {
        Status = StatusCodes.Status409Conflict,
        Title = "Duplicate tag",
        Detail = $"A tag with the name '{trimmedName}' already exists."
      });
    }

    var tag = new Tag
    {
      Name = trimmedName,
      OwnerId = currentUser.RequireId()
    };

    db.Tags.Add(tag);
    await db.SaveChangesAsync(ct);

    return Results.Created($"/api/tags/{tag.Id}", tag);
  }
}
