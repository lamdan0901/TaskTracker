using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Features.Categories;

public sealed record CategoryCreateRequest(
  [Required(AllowEmptyStrings =false,ErrorMessage ="Category name is required.")]
  [MaxLength(50)]
  string Name
);

public static class CreateCategory
{
  public static void Map(IEndpointRouteBuilder app) => app.MapPost("/api/categories", Handle);

  private static async Task<IResult> Handle(CategoryCreateRequest req, AppDbContext db, CancellationToken ct)
  {
    var trimmedName = req.Name.Trim();
    var exists = await db.Categories.AnyAsync(c => c.Name == trimmedName, ct);
    if (exists)
    {
      return Results.Conflict(new ProblemDetails
      {
        Status = StatusCodes.Status409Conflict,
        Title = "Duplicate category",
        Detail = $"A category with the name '{trimmedName}' already exists."
      });
    }

    var category = new Category { Name = trimmedName };
    db.Categories.Add(category);
    await db.SaveChangesAsync(ct);

    return Results.Created($"/api/categories/{category.Id}", category);
  }
}