using LogTool.Api.Exceptions;

namespace LogTool.Api.Services;

public static class AttendanceTypes
{
    public static readonly IReadOnlyList<string> All =
    [
        "Office",
        "Home Office",
        "Leave",
        "School",
        "Mission",
        "Company Activity",
        "Bank Holiday",
        "Report"
    ];

    public static string ValidateAndNormalize(string attendance)
    {
        var normalized = attendance?.Trim() ?? string.Empty;
        var canonicalValue = All.FirstOrDefault(
            value => string.Equals(value, normalized, StringComparison.OrdinalIgnoreCase));

        return canonicalValue ?? throw new InvalidAttendanceException(attendance ?? string.Empty);
    }
}
