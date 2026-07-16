using LogTool.Api.Exceptions;
using LogTool.Api.Models;

namespace LogTool.Api.Services;

public sealed class MonthlyReportService(
    ExcelService excelService,
    ExcelSchemaService schemaService)
{
    private const int HoursPerDay = 8;

    private static readonly HashSet<string> LeaveAttendance = new(StringComparer.OrdinalIgnoreCase)
    {
        "Leave",
        "Bank Holiday"
    };

    public Task<MonthlyReportDto> GetAsync(
        int year,
        int month,
        CancellationToken cancellationToken)
    {
        if (year is < 2000 or > 2100 || month is < 1 or > 12)
        {
            throw new InvalidPeriodException();
        }

        return excelService.ExecuteReadAsync(
            workbook =>
            {
                var logWorksheet = schemaService.GetLogWorksheet(workbook);
                var attendanceWorksheet = schemaService.GetAttendanceWorksheet(workbook);
                var members = schemaService.GetActiveMembers(logWorksheet);
                var attendanceRows = schemaService.GetDateRows(attendanceWorksheet);

                var memberColumns = members.ToDictionary(
                    member => member.Name,
                    member => schemaService.FindActiveMemberColumn(attendanceWorksheet, member.Name));

                var weekdays = EachWeekdayInMonth(year, month).ToList();
                var attendanceByDate = weekdays.ToDictionary(
                    date => date,
                    date => ReadDayAttendance(attendanceWorksheet, attendanceRows, memberColumns, date));

                var bankHolidayCount = weekdays.Count(date =>
                    attendanceByDate[date].Values.Any(value =>
                        string.Equals(value, "Bank Holiday", StringComparison.OrdinalIgnoreCase)));
                var workingDays = weekdays.Count - bankHolidayCount;

                var entries = members
                    .Select(member => BuildEntry(member.Name, weekdays, attendanceByDate, workingDays))
                    .ToList();

                return new MonthlyReportDto(workingDays, entries);
            },
            cancellationToken);
    }

    private static MonthlyReportEntryDto BuildEntry(
        string memberName,
        IReadOnlyList<DateOnly> weekdays,
        IReadOnlyDictionary<DateOnly, Dictionary<string, string?>> attendanceByDate,
        int workingDays)
    {
        var officeDays = 0;
        var leaveDays = 0;
        var remoteDates = new List<DateOnly>();

        foreach (var date in weekdays)
        {
            var value = attendanceByDate[date][memberName];
            if (value is null)
            {
                continue;
            }

            if (string.Equals(value, "Office", StringComparison.OrdinalIgnoreCase))
            {
                officeDays++;
            }
            else if (string.Equals(value, "Home Office", StringComparison.OrdinalIgnoreCase))
            {
                remoteDates.Add(date);
            }
            else if (LeaveAttendance.Contains(value))
            {
                leaveDays++;
            }
        }

        var remoteDays = remoteDates.Count;
        var totalWorkedDays = officeDays + remoteDays;

        return new MonthlyReportEntryDto(
            memberName,
            officeDays,
            officeDays * HoursPerDay,
            remoteDays,
            remoteDays * HoursPerDay,
            totalWorkedDays,
            totalWorkedDays * HoursPerDay,
            leaveDays,
            workingDays - totalWorkedDays,
            remoteDates);
    }

    private static Dictionary<string, string?> ReadDayAttendance(
        ClosedXML.Excel.IXLWorksheet attendanceWorksheet,
        IReadOnlyDictionary<DateOnly, int> attendanceRows,
        IReadOnlyDictionary<string, int> memberColumns,
        DateOnly date)
    {
        var result = new Dictionary<string, string?>();

        if (!attendanceRows.TryGetValue(date, out var row))
        {
            foreach (var memberName in memberColumns.Keys)
            {
                result[memberName] = null;
            }

            return result;
        }

        foreach (var (memberName, column) in memberColumns)
        {
            var value = attendanceWorksheet.Cell(row, column).GetString();
            result[memberName] = string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }

        return result;
    }

    private static IEnumerable<DateOnly> EachWeekdayInMonth(int year, int month)
    {
        var daysInMonth = DateTime.DaysInMonth(year, month);

        for (var day = 1; day <= daysInMonth; day++)
        {
            var current = new DateOnly(year, month, day);
            if (current.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday))
            {
                yield return current;
            }
        }
    }
}
