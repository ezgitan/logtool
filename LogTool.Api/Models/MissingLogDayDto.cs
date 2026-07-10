namespace LogTool.Api.Models;

public sealed record MissingLogDayDto(
    DateOnly Date,
    string? Attendance,
    bool HasLog);
