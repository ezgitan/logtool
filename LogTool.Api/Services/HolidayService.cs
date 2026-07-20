using System.Text.Json;

namespace LogTool.Api.Services;

/// <summary>
/// Caches Turkish public holidays (fetched from the free Nager.Date API) to
/// Data\holidays.json, keyed by year. Callers always read from the cache -
/// nothing ever makes a live API call while serving a request, so an outage
/// or unreachable network on this API never breaks the monthly report; it
/// just means that year's cache doesn't get refreshed until it succeeds.
/// </summary>
public sealed class HolidayService
{
    private static readonly SemaphoreSlim FileLock = new(1, 1);
    private readonly string _filePath;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<HolidayService> _logger;

    public HolidayService(IWebHostEnvironment environment, IHttpClientFactory httpClientFactory, ILogger<HolidayService> logger)
    {
        _filePath = Path.Combine(environment.ContentRootPath, "Data", "holidays.json");
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<IReadOnlySet<DateOnly>> GetHolidaysAsync(int year, CancellationToken cancellationToken)
    {
        var cache = await ReadCacheAsync(cancellationToken);
        return cache.TryGetValue(year, out var dates) ? dates.ToHashSet() : new HashSet<DateOnly>();
    }

    /// <summary>Fetches and caches a year's holidays if not already cached. Safe to call often - a no-op once cached.</summary>
    public async Task EnsureYearCachedAsync(int year, CancellationToken cancellationToken)
    {
        var cache = await ReadCacheAsync(cancellationToken);
        if (cache.ContainsKey(year))
        {
            return;
        }

        try
        {
            var fetched = await FetchFromApiAsync(year, cancellationToken);
            cache[year] = fetched;
            await WriteCacheAsync(cache, cancellationToken);
            _logger.LogInformation("Cached {Count} public holidays for {Year}", fetched.Count, year);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(
                exception,
                "Could not fetch public holidays for {Year} from the holiday API - monthly reports for that " +
                "year will only reflect days someone manually marked as 'Bank Holiday' until this succeeds.",
                year);
        }
    }

    private async Task<List<DateOnly>> FetchFromApiAsync(int year, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient(nameof(HolidayService));
        var holidays = await client.GetFromJsonAsync<List<NagerHoliday>>(
            $"https://date.nager.at/api/v3/PublicHolidays/{year}/TR", cancellationToken);
        return holidays?.Select(h => h.Date).ToList() ?? [];
    }

    private async Task<Dictionary<int, List<DateOnly>>> ReadCacheAsync(CancellationToken cancellationToken)
    {
        await FileLock.WaitAsync(cancellationToken);
        try
        {
            if (!File.Exists(_filePath))
            {
                return [];
            }

            await using var stream = File.OpenRead(_filePath);
            var data = await JsonSerializer.DeserializeAsync<Dictionary<int, List<DateOnly>>>(
                stream, cancellationToken: cancellationToken);
            return data ?? [];
        }
        finally
        {
            FileLock.Release();
        }
    }

    private async Task WriteCacheAsync(Dictionary<int, List<DateOnly>> cache, CancellationToken cancellationToken)
    {
        await FileLock.WaitAsync(cancellationToken);
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_filePath)!);
            await using var stream = File.Create(_filePath);
            await JsonSerializer.SerializeAsync(
                stream, cache, new JsonSerializerOptions { WriteIndented = true }, cancellationToken);
        }
        finally
        {
            FileLock.Release();
        }
    }

    private sealed record NagerHoliday(DateOnly Date);
}
