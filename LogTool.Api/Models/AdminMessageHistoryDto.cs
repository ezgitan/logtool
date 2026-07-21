namespace LogTool.Api.Models;

public sealed record AdminMessageHistoryDto(string Id, string Message, string Target, DateTimeOffset SentAt);
