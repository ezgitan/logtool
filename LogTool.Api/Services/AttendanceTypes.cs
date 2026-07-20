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

    public static readonly IReadOnlyList<AttendanceCodeInfo> Legend =
    [
        new("Office", "O", "Ofis"),
        new("Home Office", "U", "Uzaktan Çalışma"),
        new("Leave", "Y", "Yıllık Ücretli İzin"),
        new("School", "S", "Okul"),
        new("Mission", "G", "Görevli"),
        new("Company Activity", "Ç", "Şirket Etkinliği"),
        new("Bank Holiday", "B", "Resmi Tatil"),
        new("Report", "R", "Sağlık Raporu"),
    ];

    private static readonly IReadOnlyDictionary<string, string> Codes =
        Legend.ToDictionary(entry => entry.Attendance, entry => entry.Code, StringComparer.OrdinalIgnoreCase);

    public static string ValidateAndNormalize(string attendance)
    {
        var normalized = attendance?.Trim() ?? string.Empty;
        var canonicalValue = All.FirstOrDefault(
            value => string.Equals(value, normalized, StringComparison.OrdinalIgnoreCase));

        return canonicalValue ?? throw new InvalidAttendanceException(attendance ?? string.Empty);
    }

    public static string CodeFor(string attendance) =>
        Codes.TryGetValue(attendance, out var code) ? code : attendance;
}

public sealed record AttendanceCodeInfo(string Attendance, string Code, string Label);
