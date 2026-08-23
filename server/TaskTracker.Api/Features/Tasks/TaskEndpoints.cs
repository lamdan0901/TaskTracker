using TaskTracker.Api.Features.Tasks.Subtasks;

namespace TaskTracker.Api.Features.Tasks;

/// <summary>
/// The slice's single registration point. Program.cs calls this and nothing else,
/// so adding a use case means adding one file plus one line here.
/// </summary>
public static class TaskEndpoints
{
    public static void MapTaskEndpoints(this WebApplication app)
    {
        // Order does not matter for routing — ASP.NET Core matches by template
        // precedence (literal segments beat parameter segments), not by
        // registration order. Kept in CRUD order for readability only.
        ListTasks.Map(app);
        GetTask.Map(app);
        CreateTask.Map(app);
        UpdateTask.Map(app);
        MarkAllTasks.Map(app);
        DeleteTask.Map(app);

        app.MapSubtaskEndpoints();
    }
}
