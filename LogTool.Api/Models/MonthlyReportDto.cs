namespace LogTool.Api.Models;

public sealed record MonthlyReportDto(
    int WorkingDaysInMonth,
    IReadOnlyList<MonthlyReportEntryDto> Members);
