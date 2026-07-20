using ClosedXML.Excel;

namespace LogTool.Api.Services;

public sealed class DateRolloverService(
    ExcelService excelService,
    ExcelSchemaService schemaService,
    HolidayService holidayService,
    TimeProvider timeProvider,
    ILogger<DateRolloverService> logger) : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromMinutes(15);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(CheckInterval);

        do
        {
            await EnsureTodayRowsAsync(stoppingToken);
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task EnsureTodayRowsAsync(CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime);
        var currentYearHolidays = await holidayService.GetHolidaysAsync(today.Year, cancellationToken);
        var previousYearHolidays = await holidayService.GetHolidaysAsync(today.Year - 1, cancellationToken);

        bool IsHoliday(DateOnly date) =>
            (date.Year == today.Year ? currentYearHolidays : previousYearHolidays).Contains(date);

        try
        {
            await excelService.ExecuteWriteAsync(
                workbook =>
                {
                    var logWorksheet = schemaService.GetLogWorksheet(workbook);
                    var attendanceWorksheet = schemaService.GetAttendanceWorksheet(workbook);
                    var addedAny = false;

                    foreach (var date in DatesToBackfill(logWorksheet, today))
                    {
                        schemaService.EnsureDateRow(logWorksheet, date);
                        var attendanceRow = schemaService.EnsureDateRow(attendanceWorksheet, date);
                        addedAny = true;

                        if (IsHoliday(date))
                        {
                            MarkBankHolidayForBlankMembers(attendanceWorksheet, attendanceRow);
                        }
                    }

                    return addedAny;
                },
                cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Tarih sütunu otomatik güncellenirken hata oluştu.");
        }
    }

    private void MarkBankHolidayForBlankMembers(IXLWorksheet attendanceWorksheet, int row)
    {
        foreach (var member in schemaService.GetActiveMembers(attendanceWorksheet))
        {
            var column = schemaService.FindActiveMemberColumn(attendanceWorksheet, member.Name);
            var cell = attendanceWorksheet.Cell(row, column);
            if (string.IsNullOrWhiteSpace(cell.GetString()))
            {
                cell.FormulaA1 = string.Empty;
                cell.SetValue(AttendanceTypes.BankHoliday);
            }
        }
    }

    private IEnumerable<DateOnly> DatesToBackfill(IXLWorksheet logWorksheet, DateOnly today)
    {
        var existingDates = schemaService.GetDateRows(logWorksheet).Keys;
        var lastDate = existingDates.Any() ? existingDates.Max() : today;
        var startDate = lastDate < today ? lastDate.AddDays(1) : today;

        for (var date = startDate; date <= today; date = date.AddDays(1))
        {
            if (date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
            {
                continue;
            }

            yield return date;
        }
    }
}
