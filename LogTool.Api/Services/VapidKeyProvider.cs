using System.Text.Json;
using WebPush;

namespace LogTool.Api.Services;

public sealed class VapidKeyProvider
{
    private sealed record StoredVapidKeys(string PublicKey, string PrivateKey);

    public VapidKeyProvider(IWebHostEnvironment environment)
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
