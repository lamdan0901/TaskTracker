namespace TaskTracker.Api.Common;

public sealed record PagedResult<T>(
  IReadOnlyList<T> Items,
  int TotalCount,
  int PageIndex,
  int PageSize);
