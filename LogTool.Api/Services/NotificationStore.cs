using System.Text.Json;

namespace LogTool.Api.Services;

public sealed class NotificationRecord
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Message { get; set; } = "";
    public DateTimeOffset SentAt { get; set; }
    public bool Read { get; set; }
}

public sealed class NotificationStore
{
    private const int MaxPerMember = 50;
    private static readonly SemaphoreSlim FileLock = new(1, 1);
    private static readonly JsonSerializerOptions SerializerOptions = new() { WriteIndented = true };
    private readonly string _filePath;

    public NotificationStore(IWebHostEnvironment environment)
    {
        _filePath = Path.Combine(environment.ContentRootPath, "Data", "notifications.json");
    }

    public async Task AddAsync(
        IEnumerable<string> memberNames,
        string message,
        DateTimeOffset sentAt,
        CancellationToken cancellationToken)
    {
        await FileLock.WaitAsync(cancellationToken);
        try
        {
            var data = await ReadAsync(cancellationToken);
            foreach (var memberName in memberNames)
            {
                if (!data.TryGetValue(memberName, out var list))
                {
                    list = [];
                    data[memberName] = list;
                }

                list.Insert(0, new NotificationRecord { Message = message, SentAt = sentAt, Read = false });
                if (list.Count > MaxPerMember)
                {
                    list.RemoveRange(MaxPerMember, list.Count - MaxPerMember);
                }
            }

            await WriteAsync(data, cancellationToken);
        }
        finally
        {
            FileLock.Release();
        }
    }

    public async Task<IReadOnlyList<NotificationRecord>> GetForMemberAsync(string memberName, CancellationToken cancellationToken)
    {
        await FileLock.WaitAsync(cancellationToken);
        try
        {
            var data = await ReadAsync(cancellationToken);
            return data.TryGetValue(memberName, out var list) ? list : [];
        }
        finally
        {
            FileLock.Release();
        }
    }

    public async Task MarkAllReadAsync(string memberName, CancellationToken cancellationToken)
    {
        await FileLock.WaitAsync(cancellationToken);
        try
        {
            var data = await ReadAsync(cancellationToken);
            if (!data.TryGetValue(memberName, out var list))
            {
                return;
            }

            foreach (var record in list)
            {
                record.Read = true;
            }

            await WriteAsync(data, cancellationToken);
        }
        finally
        {
            FileLock.Release();
        }
    }

    private async Task<Dictionary<string, List<NotificationRecord>>> ReadAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_filePath))
        {
            return new Dictionary<string, List<NotificationRecord>>();
        }

        await using var stream = File.OpenRead(_filePath);
        var data = await JsonSerializer.DeserializeAsync<Dictionary<string, List<NotificationRecord>>>(
            stream, cancellationToken: cancellationToken);
        return data ?? new Dictionary<string, List<NotificationRecord>>();
    }

    private async Task WriteAsync(Dictionary<string, List<NotificationRecord>> data, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_filePath)!);
        await using var stream = File.Create(_filePath);
        await JsonSerializer.SerializeAsync(stream, data, SerializerOptions, cancellationToken);
    }
}
