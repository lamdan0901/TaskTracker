using System.ComponentModel.DataAnnotations;
using TaskTracker.Api.Data;
using TaskTracker.Api.Data.Entities;
using TaskTracker.Api.Common;
using Microsoft.EntityFrameworkCore;

namespace TaskTracker.Api.Features.Tasks;

/// <summary>
/// Partial update: both fields nullable, null meaning "leave alone". That makes
/// "at least one field" and "not blank when provided" cross-field rules, which
/// no single attribute can express — hence IValidatableObject.
/// </summary>
public sealed record TaskUpdateRequest(
    [MaxLength(200)] string? Title,
    bool? IsDone,
    int? CategoryId,
    Priority? Priority,
    DateOnly? DueDate,
    List<int>? TagIds = null) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext ctx)
    {
        if ((Title, IsDone, CategoryId, TagIds, Priority, DueDate) is (null, null, null, null, null, null))
            yield return new ValidationResult("At least one field must be provided.");

        // Distinguish absent (null, fine) from present-but-blank (rejected).
        if (Title is not null && string.IsNullOrWhiteSpace(Title))
            yield return new ValidationResult("Title cannot be blank when provided.", [nameof(Title)]);
    }
}

public static class UpdateTask
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPut("/api/tasks/{id:int}", Handle);

    private static async Task<IResult> Handle(
        int id,
        TaskUpdateRequest req,
        AppDbContext db,
        CancellationToken ct)
    {
        // FindAsync returns a TRACKED entity, unlike the AsNoTracking() read in
        // ListTasks — that tracking is what lets SaveChangesAsync see the mutations.
        var task = await db.Tasks
           .Include(t => t.Tags)
           .FirstOrDefaultAsync(t => t.Id == id, ct);
        if (task is null) return Results.NotFound();

        if (req.CategoryId is not null)
        {
            if (await db.ValidateCategoryExistsAsync(req.CategoryId, ct) is { } errorResult)
            {
                return errorResult;
            }
            task.CategoryId = req.CategoryId.Value;
        }

        if (req.TagIds is not null)
        {
            var (tagError, tags) = await db.ValidateTagsExistAsync(req.TagIds, ct);
            if (tagError is not null)
            {
                return tagError;
            }
            task.Tags = tags;
        }

        // Shape validation already passed. Only the "does it exist" check is left,
        // because that one needs the database.
        if (req.Title is not null) task.Title = req.Title.Trim();
        if (req.IsDone is not null) task.IsDone = req.IsDone.Value;
        if (req.Priority is not null) task.Priority = req.Priority.Value;
        task.DueDate = req.DueDate.HasValue ? req.DueDate.Value : null;

        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }
}
