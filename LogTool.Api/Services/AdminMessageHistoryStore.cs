using System.Text.Json;

namespace LogTool.Api.Services;

public sealed class AdminMessageRecord
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Message { get; set; } = "";
    /// <summary>"All users" for a broadcast, or a specific member name for a targeted message.</summary>
    public string Target { get; set; } = "";
    public DateTimeOffset SentAt { get; set; }
}

/// <summary>
/// Log of messages an admin has sent, independent of the per-recipient
/// notification records in <see cref="NotificationStore"/> - lets the
/// Settings page show "what did I send and to whom" without duplicating
/// the same broadcast message once per recipient.
/// </summary>
public sealed class AdminMessageHistoryStore
{
    private const int MaxEntries = 200;
    private static readonly SemaphoreSlim FileLock = new(1, 1);
    private static readonly JsonSerializerOptions SerializerOptions = new() { WriteIndented = true };
    private readonly string _filePath;

    public AdminMessageHistoryStore(IWebHostEnvironment environment)
    {
        _filePath = Path.Combine(environment.ContentRootPath, "Data", "admin-message-history.json");
    }

    public async Task AddAsync(string message, string target, DateTimeOffset sentAt, CancellationToken cancellationToken)
    {
        await FileLock.WaitAsync(cancellationToken);
        try
        {
            var data = await ReadAsync(cancellationToken);
            data.Insert(0, new AdminMessageRecord { Message = message, Target = target, SentAt = sentAt });
            if (data.Count > MaxEntries)
            {
                data.RemoveRange(MaxEntries, data.Count - MaxEntries);
            }

            await WriteAsync(data, cancellationToken);
        }
        finally
        {
            FileLock.Release();
        }
    }

    public async Task<IReadOnlyList<AdminMessageRecord>> GetAllAsync(CancellationToken cancellationToken)
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

    public async Task DeleteAsync(string id, CancellationToken cancellationToken)
    {
        await FileLock.WaitAsync(cancellationToken);
        try
        {
            var data = await ReadAsync(cancellationToken);
            data.RemoveAll(record => record.Id == id);
            await WriteAsync(data, cancellationToken);
        }
        finally
        {
            FileLock.Release();
        }
    }

    public async Task ClearAllAsync(CancellationToken cancellationToken)
    {
        await FileLock.WaitAsync(cancellationToken);
        try
        {
            await WriteAsync([], cancellationToken);
        }
        finally
        {
            FileLock.Release();
        }
    }

    private async Task<List<AdminMessageRecord>> ReadAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_filePath))
        {
            return [];
        }

        await using var stream = File.OpenRead(_filePath);
        var data = await JsonSerializer.DeserializeAsync<List<AdminMessageRecord>>(stream, cancellationToken: cancellationToken);
        return data ?? [];
    }

    private async Task WriteAsync(List<AdminMessageRecord> data, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_filePath)!);
        await using var stream = File.Create(_filePath);
        await JsonSerializer.SerializeAsync(stream, data, SerializerOptions, cancellationToken);
    }
}
