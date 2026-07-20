namespace LogTool.Api.Services;

/// <summary>
/// Keeps HolidayService's cache populated for the current and next year (so
/// the December-to-January turnover is already covered ahead of time)
/// without any request ever waiting on a live API call itself.
/// </summary>
public sealed class HolidayCacheRefreshService(
    HolidayService holidayService,
    TimeProvider timeProvider) : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromHours(24);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(CheckInterval);

        do
        {
            var year = timeProvider.GetLocalNow().Year;
            await holidayService.EnsureYearCachedAsync(year, stoppingToken);
            await holidayService.EnsureYearCachedAsync(year + 1, stoppingToken);
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
