using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TaskTracker.Api.Common;

public sealed class GlobalExeptionHandler(ILogger<GlobalExeptionHandler> logger) : IExceptionHandler
{
  public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
  {
    logger.LogError(exception, "Unhandled exception occurred: {Message}", exception.Message);

    var (statusCode, title) = exception switch
    {
      DbUpdateConcurrencyException => (StatusCodes.Status409Conflict, "Concurrency Conflict"),
      KeyNotFoundException => (StatusCodes.Status404NotFound, "Resource Not Found"),
      _ => (StatusCodes.Status500InternalServerError, "An unexpected server error occurred")
    };

    var problemDetails = new ProblemDetails
    {
      Status = statusCode,
      Title = title,
      Detail = httpContext.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment() ? exception.Message : "Please contact support if the issue persists.",
      Instance = $"{httpContext.Request.Method} {httpContext.Request.Path}"
    };

    httpContext.Response.StatusCode = statusCode;
    await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

    return true;  // Return true to signal that the exception has been handled
  }
}