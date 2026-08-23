
namespace TaskTracker.Api.Features.Tasks.Subtasks;

/// <summary>
/// Read contract returned by Subtask endpoints.
/// </summary>
public sealed record SubtaskResponse(
    int Id,
    string Title,
    bool IsDone,
    DateTime CreatedAt,
    int TaskId
);
