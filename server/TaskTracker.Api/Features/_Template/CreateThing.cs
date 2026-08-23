using System.ComponentModel.DataAnnotations;
using TaskTracker.Api.Data;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Features.Things;

// ─── Contract ────────────────────────────────────────────────────────────────
// Same file as its handler: this record exists only to serve CreateThing.
// Only list fields the CLIENT is allowed to set. Ids, timestamps, ownership and
// status flags are server-owned — omitting them here is what prevents over-posting.
public sealed record ThingCreateRequest(
    [Required(AllowEmptyStrings = false, ErrorMessage = "Name is required.")]
    [MaxLength(200)]
    string Name,

    // Optional field: nullable + no [Required]. Validation attributes all treat
    // null as "not supplied" and pass it.
    [Range(1, 100)] int? Quantity) : IValidatableObject
{
    // For rules no single attribute can express: whitespace-only strings, or any
    // rule spanning two properties. Runs after the attributes, only if they passed.
    public IEnumerable<ValidationResult> Validate(ValidationContext ctx)
    {
        if (string.IsNullOrWhiteSpace(Name))
            yield return new ValidationResult("Name cannot be blank.", [nameof(Name)]);
    }
}

// ─── Use case ────────────────────────────────────────────────────────────────
public static class CreateThing
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/api/things", Handle);

    // Parameters are resolved by source: body (complex type), route/query
    // (primitives), or DI (registered services). CancellationToken always last.
    private static async Task<IResult> Handle(
        ThingCreateRequest req,
        AppDbContext db,
        CancellationToken ct)
    {
        // No `if (!valid)` — the validation filter already rejected bad shapes.
        // Only checks needing the database belong here (existence, uniqueness).

        // Hand-mapping request -> entity IS the allowlist. Never db.Add(clientDto).
        var thing = new Thing { Name = req.Name.Trim() };

        db.Things.Add(thing);
        await db.SaveChangesAsync(ct);

        // 201 + Location header pointing at the new resource.
        return Results.Created($"/api/things/{thing.Id}", thing);
    }
}
