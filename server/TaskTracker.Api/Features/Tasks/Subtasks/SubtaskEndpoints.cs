namespace TaskTracker.Api.Features.Tasks.Subtasks;

public static class SubtaskEndpoints
{
  public static void MapSubtaskEndpoints(this IEndpointRouteBuilder app)
  {
    ListSubtasks.Map(app);
    CreateSubtask.Map(app);
    UpdateSubtask.Map(app);
    DeleteSubtask.Map(app);
  }
}
