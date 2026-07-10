namespace LogTool.Api.Models;

public sealed record LogEntryDto(
    string MemberName,
    DateOnly Date,
    string? Attendance,
    string? Log);
