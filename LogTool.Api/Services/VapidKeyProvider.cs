using System.Text.Json;
using WebPush;

namespace LogTool.Api.Services;

public sealed class VapidKeyProvider
{
    private sealed record StoredVapidKeys(string PublicKey, string PrivateKey);

    public VapidKeyProvider(IWebHostEnvironment environment, ILogger<VapidKeyProvider> logger)
    {
        var filePath = Path.Combine(environment.ContentRootPath, "Data", "vapid-keys.json");

        if (File.Exists(filePath))
        {
            var stored = JsonSerializer.Deserialize<StoredVapidKeys>(File.ReadAllText(filePath))!;
            PublicKey = stored.PublicKey;
            PrivateKey = stored.PrivateKey;
        }
        else
        {
            logger.LogWarning(
                "No {FilePath} found - generating a new VAPID key pair. If this server has run " +
                "before, every existing reminder notification subscription is now invalid " +
                "(pushes will fail with 401/403 until each person re-enables notifications). " +
                "This usually means Data\\ was overwritten during a deployment.",
                filePath);

            var generated = VapidHelper.GenerateVapidKeys();
            PublicKey = generated.PublicKey;
            PrivateKey = generated.PrivateKey;

            Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
            File.WriteAllText(
                filePath,
                JsonSerializer.Serialize(
                    new StoredVapidKeys(PublicKey, PrivateKey),
                    new JsonSerializerOptions { WriteIndented = true }));
        }
    }

    public string PublicKey { get; }

    public string PrivateKey { get; }

    public string Subject => "mailto:logtool@local";
}
