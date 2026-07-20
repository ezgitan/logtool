namespace LogTool.Api.Options;

public sealed class ExcelOptions
{
    public const string SectionName = "Excel";

    public string FilePath { get; init; } = "Data/Logs.xlsx";
    public string? NetworkOpenUrl { get; init; }
    public string LogWorksheet { get; init; } = "LogFile";
    public string AttendanceWorksheet { get; init; } = "Attendance";
    public int HeaderRow { get; init; } = 1;
    public int DateColumn { get; init; } = 1;
    public int FirstMemberColumn { get; init; } = 2;
}
