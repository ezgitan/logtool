namespace LogTool.Api.Models;

public sealed record NotificationDto(string Id, string Message, DateTimeOffset SentAt, bool Read);
