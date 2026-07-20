using LogTool.Api.Models;

namespace LogTool.Api.Services;

public sealed class AttendanceGridService(
    ExcelService excelService,
    ExcelSchemaService schemaService)
{
    public Task<AttendanceGridDto> GetAsync(int year, int month, CancellationToken cancellationToken) =>
        excelService.ExecuteReadAsync(
            workbook =>
            {
                var attendanceWorksheet = schemaService.GetAttendanceWorksheet(workbook);
                var members = schemaService.GetActiveMembers(attendanceWorksheet);
                var dateRows = schemaService.GetDateRowsInMonth(attendanceWorksheet, year, month);
                var dates = BuildWeekdays(year, month);

                var rows = new List<AttendanceGridRowDto>(members.Count);
                foreach (var member in members)
                {
                    var column = schemaService.FindActiveMemberColumn(attendanceWorksheet, member.Name);
                    var codes = new List<string?>(dates.Count);

                    foreach (var date in dates)
                    {
                        if (!dateRows.TryGetValue(date, out var row))
                        {
                            codes.Add(null);
                            continue;
                        }

                        var raw = attendanceWorksheet.Cell(row, column).GetString().Trim();
                        codes.Add(raw.Length == 0 ? null : AttendanceTypes.CodeFor(raw));
                    }

                    rows.Add(new AttendanceGridRowDto(member.Name, codes));
                }

                var legend = AttendanceTypes.Legend
                    .Select(entry => new AttendanceLegendEntryDto(entry.Code, entry.Label))
                    .ToList();

                return new AttendanceGridDto(dates, rows, legend);
            },
            cancellationToken);

    private static List<DateOnly> BuildWeekdays(int year, int month)
    {
        var days = new List<DateOnly>();
        var day = new DateOnly(year, month, 1);

        while (day.Month == month)
        {
            if (day.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday)
            {
                days.Add(day);
            }

            day = day.AddDays(1);
        }

        return days;
    }
}
