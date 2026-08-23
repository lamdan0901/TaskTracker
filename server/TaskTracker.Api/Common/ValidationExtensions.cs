using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Data;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Common;

public static class ValidationExtensions
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

  public static async Task<(IResult? Error, List<Tag> Tags)> ValidateTagsExistAsync(
    this AppDbContext db,
    List<int>? tagIds,
    CancellationToken ct
  )
  {
    if (tagIds is null || tagIds.Count == 0) return (null, []);

    var distinctIds = tagIds.Distinct().ToList();
    var tags = await db.Tags.Where(t => distinctIds.Contains(t.Id)).ToListAsync(ct);
    if (tags.Count != distinctIds.Count)
    {
      var foundIds = tags.Select(t => t.Id).ToHashSet();
      var missingIds = distinctIds.Where(id => !foundIds.Contains(id)).ToList();
      var errorResult = Results.BadRequest(new ProblemDetails
      {
        Status = StatusCodes.Status400BadRequest,
        Title = "Invalid Tags",
        Detail = $"The following Tag IDs do not exist: [{string.Join(", ", missingIds)}]."
      });

      return (errorResult, []);
    }

    return (null, tags);
  }
}
