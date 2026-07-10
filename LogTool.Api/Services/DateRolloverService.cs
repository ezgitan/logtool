using ClosedXML.Excel;

namespace LogTool.Api.Services;

public sealed class DateRolloverService(
    ExcelService excelService,
    ExcelSchemaService schemaService,
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
                        schemaService.EnsureDateRow(attendanceWorksheet, date);
                        addedAny = true;
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
