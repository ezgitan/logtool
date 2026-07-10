namespace LogTool.Api.Models;

public sealed record DailyLogEntryDto(
    string MemberName,
    string? Attendance,
    string? Log);
