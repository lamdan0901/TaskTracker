using System.ComponentModel.DataAnnotations;
using TaskTracker.Api.Data;
using TaskTracker.Api.Common;

namespace TaskTracker.Api.Features.Tasks;

/// <summary>
/// Partial update: both fields nullable, null meaning "leave alone". That makes
/// "at least one field" and "not blank when provided" cross-field rules, which
/// no single attribute can express — hence IValidatableObject.
/// </summary>
public sealed record TaskUpdateRequest(
    [MaxLength(200)] string? Title,
    bool? IsDone,
    int? CategoryId) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext ctx)
    {
        if (Title is null && IsDone is null && CategoryId is null)
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
        var task = await db.Tasks.FindAsync([id], ct);
        if (task is null) return Results.NotFound();

        if (req.CategoryId is not null)
        {
            if (await db.ValidateCategoryExistsAsync(req.CategoryId, ct) is { } errorResult)
            {
                return errorResult;
            }
            task.CategoryId = req.CategoryId.Value;
        }

        // Shape validation already passed. Only the "does it exist" check is left,
        // because that one needs the database.
        if (req.Title is not null) task.Title = req.Title.Trim();
        if (req.IsDone is not null) task.IsDone = req.IsDone.Value;

        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }
}
