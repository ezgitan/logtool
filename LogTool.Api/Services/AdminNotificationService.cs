using System.Net;
using System.Text.Json;
using WebPush;

namespace LogTool.Api.Services;

public sealed class AdminNotificationService(
    PushSubscriptionStore store,
    VapidKeyProvider vapidKeyProvider,
    ILogger<AdminNotificationService> logger)
{
    public Task<int> SendToAllAsync(string message, CancellationToken cancellationToken) =>
        SendAsync(null, message, cancellationToken);

    public Task<int> SendToMemberAsync(string memberName, string message, CancellationToken cancellationToken) =>
        SendAsync(memberName, message, cancellationToken);

    private async Task<int> SendAsync(string? onlyMemberName, string message, CancellationToken cancellationToken)
    {
        var members = await store.GetAllAsync(cancellationToken);
        using var webPushClient = new WebPushClient();
        var vapidDetails = new VapidDetails(vapidKeyProvider.Subject, vapidKeyProvider.PublicKey, vapidKeyProvider.PrivateKey);
        var payload = JsonSerializer.Serialize(new { title = "Message from Admin", body = message });

        var sentCount = 0;
        foreach (var (memberName, settings) in members)
        {
            if (onlyMemberName is not null && !string.Equals(memberName, onlyMemberName, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            foreach (var subscription in settings.Subscriptions.ToList())
            {
                var pushSubscription = new PushSubscription(subscription.Endpoint, subscription.P256dh, subscription.Auth);
                try
                {
                    await webPushClient.SendNotificationAsync(pushSubscription, payload, vapidDetails, cancellationToken);
                    sentCount++;
                    logger.LogInformation("Admin notification sent to {MemberName}", memberName);
                }
                catch (WebPushException exception) when (
                    exception.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone)
                {
                    logger.LogInformation(
                        "Push subscription for {MemberName} is invalid ({StatusCode}) - removing it",
                        memberName, exception.StatusCode);
                    await store.RemoveSubscriptionAsync(memberName, subscription.Endpoint, cancellationToken);
                }
                catch (Exception exception)
                {
                    logger.LogWarning(exception, "Failed to send admin notification to {MemberName}", memberName);
                }
            }
        }

        return sentCount;
    }
}
