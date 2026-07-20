namespace LogTool.Api.Models;

public sealed record SendAdminNotificationRequestDto(string Message);

public sealed record SendNotificationResultDto(int SentCount);
