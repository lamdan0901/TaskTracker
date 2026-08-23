using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Common;
using TaskTracker.Api.Data;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Features.Things;

// ─── Contract ────────────────────────────────────────────────────────────────
// Bound with [AsParameters] from the query string, so it's a class-shaped record
// with init properties rather than positional parameters.
public sealed record ThingQueryRequest
{
    [MaxLength(100)]
    public string? Search { get; init; }

    // AllowedValues is the validator. The switch in the handler is the
    // injection-safe allowlist. You need both — they do different jobs.
    [AllowedValues(null, "name", "createdAt")]
    public string? SortBy { get; init; }

    [AllowedValues(null, "asc", "desc")]
    public string? SortDir { get; init; }

    [Range(0, int.MaxValue)] public int? PageIndex { get; init; }
    [Range(1, 100)] public int? PageSize { get; init; }

    // Defaults live on the contract so no two readers can disagree about them.
    public string SortByOrDefault => SortBy ?? "createdAt";
    public string SortDirOrDefault => SortDir ?? "desc";
    public int PageIndexOrDefault => PageIndex ?? 0;
    public int PageSizeOrDefault => PageSize ?? 20;
}

// ─── Use case ────────────────────────────────────────────────────────────────
public static class ListThings
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/api/things", Handle);

    private static async Task<IResult> Handle(
        AppDbContext db,
        [AsParameters] ThingQueryRequest q,
        CancellationToken ct)
    {
        // AsNoTracking: read-only, so skip the change tracker's bookkeeping.
        // Nothing executes until CountAsync/ToListAsync — this is expression building.
        var query = db.Things.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            // Escape LIKE wildcards or "50%" matches everything. Backslash FIRST,
            // otherwise it re-escapes the backslashes added on the next two lines.
            var escaped = q.Search
                .Replace("\\", "\\\\")
                .Replace("%", "\\%")
                .Replace("_", "\\_");

            query = query.Where(t => EF.Functions.Like(t.Name, $"%{escaped}%", "\\"));
        }

        // Count the FILTERED set before paging, so the client learns how many rows
        // match — not how many are on this page. Separate SELECT COUNT(*) round-trip.
        var totalCount = await query.CountAsync(ct);

        var desc = q.SortDirOrDefault == "desc";

        // IOrderedQueryable, not var: that's the type exposing ThenBy.
        IOrderedQueryable<Thing> ordered = q.SortByOrDefault switch
        {
            "name" => desc ? query.OrderByDescending(t => t.Name) : query.OrderBy(t => t.Name),
            _ => desc ? query.OrderByDescending(t => t.CreatedAt) : query.OrderBy(t => t.CreatedAt),
        };

        // Tiebreaker on the unique PK makes the sort a total order, so paging is
        // repeatable instead of shuffling rows that compare equal.
        query = ordered.ThenBy(t => t.Id);

        var pageIndex = q.PageIndexOrDefault;
        var pageSize = q.PageSizeOrDefault;
        var items = await query.Skip(pageIndex * pageSize).Take(pageSize).ToListAsync(ct);

        // Shared envelope from Common/ — pagination metadata is not slice-specific.
        return Results.Ok(new PagedResult<Thing>(items, totalCount, pageIndex, pageSize));
    }
}
