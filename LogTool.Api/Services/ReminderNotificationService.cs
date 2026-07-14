using System.Net;
using System.Text.Json;
using WebPush;

namespace LogTool.Api.Services;

public sealed class ReminderNotificationService(
    PushSubscriptionStore store,
    ExcelService excelService,
    ExcelSchemaService schemaService,
    VapidKeyProvider vapidKeyProvider,
    TimeProvider timeProvider,
    ILogger<ReminderNotificationService> logger) : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(CheckInterval);
        using var webPushClient = new WebPushClient();
        var vapidDetails = new VapidDetails(vapidKeyProvider.Subject, vapidKeyProvider.PublicKey, vapidKeyProvider.PrivateKey);

        do
        {
            await CheckAndNotifyAsync(webPushClient, vapidDetails, stoppingToken);
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task CheckAndNotifyAsync(
        WebPushClient webPushClient,
        VapidDetails vapidDetails,
        CancellationToken cancellationToken)
    {
        var now = timeProvider.GetLocalNow();
        var today = DateOnly.FromDateTime(now.DateTime);
        var members = await store.GetAllAsync(cancellationToken);

        foreach (var (memberName, settings) in members)
        {
            if (settings.Subscriptions.Count == 0)
            {
                continue;
            }

            if (settings.ReminderHour != now.Hour || settings.ReminderMinute != now.Minute)
            {
                continue;
            }

            logger.LogInformation(
                "Reminder due for {MemberName} at {Now:HH:mm} (target {Hour}:{Minute}, last notified {LastNotified}, {SubCount} subscription(s))",
                memberName, now, settings.ReminderHour, settings.ReminderMinute, settings.LastNotifiedDate, settings.Subscriptions.Count);

            if (settings.LastNotifiedDate == today)
            {
                logger.LogInformation("Skipping {MemberName} - already notified today ({Today})", memberName, today);
                continue;
            }

            var alreadyLogged = await TryHasTodayLogAsync(memberName, today, cancellationToken);
            if (alreadyLogged)
            {
                logger.LogInformation("Skipping {MemberName} - today's log is already filled in", memberName);
                await store.MarkNotifiedAsync(memberName, today, cancellationToken);
                continue;
            }

            foreach (var subscription in settings.Subscriptions.ToList())
            {
                logger.LogInformation(
                    "Sending reminder push to {MemberName} at endpoint ending '...{EndpointSuffix}'",
                    memberName, subscription.Endpoint[^Math.Min(24, subscription.Endpoint.Length)..]);
                await SendNotificationAsync(webPushClient, vapidDetails, memberName, subscription, cancellationToken);
            }

            await store.MarkNotifiedAsync(memberName, today, cancellationToken);
        }
    }

    private async Task<bool> TryHasTodayLogAsync(string memberName, DateOnly date, CancellationToken cancellationToken)
    {
        try
        {
            return await excelService.ExecuteReadAsync(
                workbook =>
                {
                    var logWorksheet = schemaService.GetLogWorksheet(workbook);
                    var logColumn = schemaService.FindActiveMemberColumn(logWorksheet, memberName);
                    var dateRows = schemaService.GetDateRows(logWorksheet);

                    return dateRows.TryGetValue(date, out var row)
                        && !string.IsNullOrWhiteSpace(logWorksheet.Cell(row, logColumn).GetString());
                },
                cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Hatırlatma için log durumu kontrol edilemedi: {MemberName}", memberName);
            return false;
        }
    }

    private async Task SendNotificationAsync(
        WebPushClient webPushClient,
        VapidDetails vapidDetails,
        string memberName,
        PushSubscriptionRecord subscription,
        CancellationToken cancellationToken)
    {
        var pushSubscription = new PushSubscription(subscription.Endpoint, subscription.P256dh, subscription.Auth);
        var payload = JsonSerializer.Serialize(new
        {
            title = "Time to log your work",
            body = "Don't forget to submit today's work log.",
        });

        try
        {
            await webPushClient.SendNotificationAsync(pushSubscription, payload, vapidDetails, cancellationToken);
            logger.LogInformation("Push notification sent successfully to {MemberName}", memberName);
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
            logger.LogWarning(exception, "Failed to send push notification to {MemberName}", memberName);
        }
    }
}
