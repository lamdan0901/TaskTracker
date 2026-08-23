namespace TaskTracker.Api.Features.Things;

/// <summary>
/// The slice's only registration point. Program.cs calls this and nothing else.
/// Adding a use case = one new file + one line here.
/// </summary>
public static class ThingEndpoints
{
    public static void MapThingEndpoints(this WebApplication app)
    {
        ListThings.Map(app);
        CreateThing.Map(app);

        // Sub-domain slices register themselves too — the parent just forwards.
        // Comments.CommentEndpoints.MapCommentEndpoints(app);
    }
}
