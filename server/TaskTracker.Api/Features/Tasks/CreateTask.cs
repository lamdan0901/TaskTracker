using System.ComponentModel.DataAnnotations;
using TaskTracker.Api.Common;
using TaskTracker.Api.Data;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Features.Tasks;

/// <summary>
/// The write contract. Only these fields are accepted from the client — Id,
/// IsDone and CreatedAt are server-owned, which is what closes over-posting.
/// </summary>
// No IValidatableObject needed: RequiredAttribute Trim()s the string before
// checking length when AllowEmptyStrings is false, so null, "" and "   " are all
// rejected by [Required] alone. UpdateTask still needs one — Title is optional
// there, so it has no [Required] to lean on.
public sealed record TaskCreateRequest(
    [Required(AllowEmptyStrings = false, ErrorMessage = "Title is required.")]
    [MaxLength(200)]
    string Title,
    int? CategoryId = null,
    List<int>? TagIds = null);

public static class CreateTask
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/api/tasks", Handle);

    private static async Task<IResult> Handle(
        TaskCreateRequest req,
        AppDbContext db,
        CancellationToken ct)
    {
        if (req.CategoryId is not null)
        {
            if (await db.ValidateCategoryExistsAsync(req.CategoryId, ct) is { } errorResult)
            {
                return errorResult;
            }
        }

        var (tagError, tags) = await db.ValidateTagsExistAsync(req.TagIds, ct);
        if (tagError is not null)
        {
            return tagError;
        }

        // Mapping request -> entity by hand IS the allowlist. Never db.Add(clientDto).
        var task = new TaskItem { Title = req.Title.Trim(), CategoryId = req.CategoryId, Tags = tags };

        db.Tasks.Add(task);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/tasks/{task.Id}", task);
    }
}
