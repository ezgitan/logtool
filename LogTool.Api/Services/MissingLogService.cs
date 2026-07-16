using LogTool.Api.Models;

namespace LogTool.Api.Services;

public sealed class MissingLogService(
    ExcelService excelService,
    ExcelSchemaService schemaService,
    TimeProvider timeProvider)
{
    private static readonly HashSet<string> LogOptionalAttendance = new(StringComparer.OrdinalIgnoreCase)
    {
        "Bank Holiday",
        "Leave",
        "Report",
        "N/A"
    };

    public Task<IReadOnlyList<MissingLogDayDto>> GetAsync(
        string memberName,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime);

        return excelService.ExecuteReadAsync<IReadOnlyList<MissingLogDayDto>>(
            workbook =>
            {
                var logWorksheet = schemaService.GetLogWorksheet(workbook);
                var attendanceWorksheet = schemaService.GetAttendanceWorksheet(workbook);
                var logColumn = schemaService.FindActiveMemberColumn(logWorksheet, memberName);
                var attendanceColumn = schemaService.FindActiveMemberColumn(attendanceWorksheet, memberName);
                var logRows = schemaService.GetDateRowsInMonth(logWorksheet, today.Year, today.Month);
                var attendanceRows = schemaService.GetDateRowsInMonth(attendanceWorksheet, today.Year, today.Month);
                var missingDays = new List<MissingLogDayDto>();

                foreach (var (date, logRow) in logRows.OrderBy(item => item.Key))
                {
                    if (date > today || IsWeekend(date))
                    {
                        continue;
                    }

                    if (!attendanceRows.TryGetValue(date, out var attendanceRow))
                    {
                        continue;
                    }

                    var attendance = NullIfWhiteSpace(
                        attendanceWorksheet.Cell(attendanceRow, attendanceColumn).GetString());
                    var log = NullIfWhiteSpace(logWorksheet.Cell(logRow, logColumn).GetString());

                    if (IsMissing(attendance, log))
                    {
                        missingDays.Add(new MissingLogDayDto(date, attendance, log is not null));
                    }
                }

                return missingDays;
            },
            cancellationToken);
    }

    private static bool IsMissing(string? attendance, string? log)
    {
        if (attendance is null)
        {
            return true;
        }

        return log is null && !LogOptionalAttendance.Contains(attendance);
    }

    private static bool IsWeekend(DateOnly date) =>
        date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;

    private static string? NullIfWhiteSpace(string value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
