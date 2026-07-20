namespace LogTool.Api.Models;

public sealed record AttendanceGridDto(
    IReadOnlyList<DateOnly> Dates,
    IReadOnlyList<AttendanceGridRowDto> Members,
    IReadOnlyList<AttendanceLegendEntryDto> Legend);

public sealed record AttendanceGridRowDto(string MemberName, IReadOnlyList<string?> Codes);

public sealed record AttendanceLegendEntryDto(string Code, string Label);
