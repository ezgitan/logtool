namespace LogTool.Api.Models;

public sealed record PushSubscriptionKeysDto(string P256dh, string Auth);

public sealed record PushSubscriptionDto(string Endpoint, PushSubscriptionKeysDto Keys);

public sealed record RegisterPushSubscriptionRequest(
    string MemberName,
    PushSubscriptionDto Subscription,
    int ReminderHour,
    int ReminderMinute);

public sealed record VapidPublicKeyDto(string PublicKey);
