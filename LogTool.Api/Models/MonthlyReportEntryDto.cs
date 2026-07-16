namespace LogTool.Api.Models;

public sealed record MonthlyReportEntryDto(
    string MemberName,
    int OfficeDays,
    int OfficeHours,
    int RemoteDays,
    int RemoteHours,
    int TotalWorkedDays,
    int TotalWorkedHours,
    int TotalLeaveDays,
    int NotWorkingDays,
    IReadOnlyList<DateOnly> RemoteDates);
