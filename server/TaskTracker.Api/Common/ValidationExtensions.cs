using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data;

namespace TaskTracker.Api.Common;

public static class CategoryValidationExtensions
{
  public static async Task<IResult?> ValidateCategoryExistsAsync(
      this AppDbContext db,
      int? categoryId,
      CancellationToken ct)
  {
    if (categoryId is null) return null;

    var exists = await db.Categories.AnyAsync(c => c.Id == categoryId.Value, ct);
    if (!exists)
    {
      return Results.BadRequest(new ProblemDetails
      {
        Status = StatusCodes.Status400BadRequest,
        Title = "Invalid Category",
        Detail = $"Category with ID {categoryId.Value} does not exist."
      });
    }

    return null;
  }
}
