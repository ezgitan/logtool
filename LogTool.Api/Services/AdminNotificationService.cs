using System.Net;
using System.Text.Json;
using WebPush;

namespace LogTool.Api.Services;

public sealed class AdminNotificationService(
    PushSubscriptionStore store,
    NotificationStore notificationStore,
    MemberService memberService,
    VapidKeyProvider vapidKeyProvider,
    TimeProvider timeProvider,
    ILogger<AdminNotificationService> logger)
{
    public async Task<int> SendToAllAsync(string message, CancellationToken cancellationToken)
    {
        var activeMembers = await memberService.GetActiveMembersAsync(cancellationToken);
        var memberNames = activeMembers.Select(member => member.Name).ToList();
        await notificationStore.AddAsync(memberNames, message, timeProvider.GetUtcNow(), cancellationToken);
        return await SendPushAsync(null, message, cancellationToken);
    }

    public async Task<int> SendToMemberAsync(string memberName, string message, CancellationToken cancellationToken)
    {
        await notificationStore.AddAsync([memberName], message, timeProvider.GetUtcNow(), cancellationToken);
        return await SendPushAsync(memberName, message, cancellationToken);
    }

    private async Task<int> SendPushAsync(string? onlyMemberName, string message, CancellationToken cancellationToken)
    {
        var members = await store.GetAllAsync(cancellationToken);
        using var webPushClient = new WebPushClient();
        var vapidDetails = new VapidDetails(vapidKeyProvider.Subject, vapidKeyProvider.PublicKey, vapidKeyProvider.PrivateKey);
        var payload = JsonSerializer.Serialize(new { title = "Message from Admin", body = message });

        var reachedMembers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
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
                    reachedMembers.Add(memberName);
                    logger.LogInformation("Admin notification sent to {MemberName}", memberName);
                }
                catch (WebPushException exception) when (
                    exception.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone
                        or HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                {
                    // NotFound/Gone means the subscription itself expired. Unauthorized/
                    // Forbidden means the subscription was created against VAPID keys
                    // that no longer match the server's current ones (e.g. Data\vapid-
                    // keys.json got regenerated) - either way, this subscription will
                    // never succeed again until the person re-subscribes, so remove it
                    // now instead of failing silently on every future attempt too.
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

        return reachedMembers.Count;
    }
}
