using LogTool.Api.Exceptions;
using LogTool.Api.Models;

namespace LogTool.Api.Middleware;

public sealed class ApiExceptionMiddleware(
    RequestDelegate next,
    ILogger<ApiExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (LogToolException exception)
        {
            logger.LogWarning(
                exception, "Beklenen uygulama hatası: {ErrorCode} on {Method} {Path}",
                exception.Code, context.Request.Method, context.Request.Path);
            context.Response.StatusCode = GetStatusCode(exception);
            await context.Response.WriteAsJsonAsync(new ApiErrorDto(exception.Code, exception.Message));
        }
        catch (Exception exception)
        {
            logger.LogError(
                exception, "Unexpected error on {Method} {Path}",
                context.Request.Method, context.Request.Path);
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(
                new ApiErrorDto("unexpected_error", "An unexpected error occurred while processing the request."));
        }
    }

    private static int GetStatusCode(LogToolException exception) => exception switch
    {
        MemberNotFoundException or DateNotFoundException or WorksheetNotFoundException or ExcelFileNotFoundException
            => StatusCodes.Status404NotFound,
        InactiveMemberException or LogAlreadySubmittedException or MemberAlreadyExistsException
            => StatusCodes.Status409Conflict,
        ExcelFileLockedException => StatusCodes.Status423Locked,
        InvalidAttendanceException => StatusCodes.Status400BadRequest,
        LogSaveException => StatusCodes.Status500InternalServerError,
        _ => StatusCodes.Status400BadRequest
    };
}
