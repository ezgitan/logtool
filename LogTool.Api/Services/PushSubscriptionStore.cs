using System.Text.Json;

namespace LogTool.Api.Services;

public sealed class PushSubscriptionRecord
{
    public string Endpoint { get; set; } = "";
    public string P256dh { get; set; } = "";
    public string Auth { get; set; } = "";
}

public sealed class MemberPushSettings
{
    public int ReminderHour { get; set; }
    public int ReminderMinute { get; set; }
    public DateOnly? LastNotifiedDate { get; set; }
    public List<PushSubscriptionRecord> Subscriptions { get; set; } = [];
}

public sealed class PushSubscriptionStore
{
    private static readonly SemaphoreSlim FileLock = new(1, 1);
    private static readonly JsonSerializerOptions SerializerOptions = new() { WriteIndented = true };
    private readonly string _filePath;

    public PushSubscriptionStore(IWebHostEnvironment environment)
    {
        _filePath = Path.Combine(environment.ContentRootPath, "Data", "push-subscriptions.json");
    }

    public async Task SaveSubscriptionAsync(
        string memberName,
        PushSubscriptionRecord subscription,
        int reminderHour,
        int reminderMinute,
        CancellationToken cancellationToken)
    {
        await FileLock.WaitAsync(cancellationToken);
        try
        {
            var data = await ReadAsync(cancellationToken);
            if (!data.TryGetValue(memberName, out var settings))
            {
                settings = new MemberPushSettings();
                data[memberName] = settings;
            }

            settings.ReminderHour = reminderHour;
            settings.ReminderMinute = reminderMinute;
            settings.LastNotifiedDate = null;
            settings.Subscriptions.RemoveAll(s => s.Endpoint == subscription.Endpoint);
            settings.Subscriptions.Add(subscription);

            await WriteAsync(data, cancellationToken);
        }
        finally
        {
            FileLock.Release();
        }
    }

    public async Task<IReadOnlyDictionary<string, MemberPushSettings>> GetAllAsync(CancellationToken cancellationToken)
    {
        await FileLock.WaitAsync(cancellationToken);
        try
        {
            return await ReadAsync(cancellationToken);
        }
        finally
        {
            FileLock.Release();
        }
    }

    public async Task MarkNotifiedAsync(string memberName, DateOnly date, CancellationToken cancellationToken)
    {
        await FileLock.WaitAsync(cancellationToken);
        try
        {
            var data = await ReadAsync(cancellationToken);
            if (data.TryGetValue(memberName, out var settings))
            {
                settings.LastNotifiedDate = date;
                await WriteAsync(data, cancellationToken);
            }
        }
        finally
        {
            FileLock.Release();
        }
    }

    public async Task RemoveSubscriptionAsync(string memberName, string endpoint, CancellationToken cancellationToken)
    {
        await FileLock.WaitAsync(cancellationToken);
        try
        {
            var data = await ReadAsync(cancellationToken);
            if (data.TryGetValue(memberName, out var settings))
            {
                settings.Subscriptions.RemoveAll(s => s.Endpoint == endpoint);
                await WriteAsync(data, cancellationToken);
            }
        }
        finally
        {
            FileLock.Release();
        }
    }

    private async Task<Dictionary<string, MemberPushSettings>> ReadAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_filePath))
        {
            return new Dictionary<string, MemberPushSettings>();
        }

        await using var stream = File.OpenRead(_filePath);
        var data = await JsonSerializer.DeserializeAsync<Dictionary<string, MemberPushSettings>>(
            stream, cancellationToken: cancellationToken);
        return data ?? new Dictionary<string, MemberPushSettings>();
    }

    private async Task WriteAsync(Dictionary<string, MemberPushSettings> data, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_filePath)!);
        await using var stream = File.Create(_filePath);
        await JsonSerializer.SerializeAsync(stream, data, SerializerOptions, cancellationToken);
    }
}
