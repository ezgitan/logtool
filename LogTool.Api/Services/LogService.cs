using LogTool.Api.Exceptions;
using LogTool.Api.Models;

namespace LogTool.Api.Services;

public sealed class LogService(
    ExcelService excelService,
    ExcelSchemaService schemaService,
    ILogger<LogService> logger)
{
    public Task<LogEntryDto> GetAsync(
        string memberName,
        DateOnly date,
        CancellationToken cancellationToken) =>
        excelService.ExecuteReadAsync(
            workbook =>
            {
                var logWorksheet = schemaService.GetLogWorksheet(workbook);
                var attendanceWorksheet = schemaService.GetAttendanceWorksheet(workbook);

                var logColumn = schemaService.FindActiveMemberColumn(logWorksheet, memberName);
                var attendanceColumn = schemaService.FindActiveMemberColumn(attendanceWorksheet, memberName);
                var logRow = schemaService.FindDateRow(logWorksheet, date);
                var attendanceRow = schemaService.FindDateRow(attendanceWorksheet, date);

                return new LogEntryDto(
                    logWorksheet.Cell(1, logColumn).GetString().Trim(),
                    date,
                    NullIfWhiteSpace(attendanceWorksheet.Cell(attendanceRow, attendanceColumn).GetString()),
                    NullIfWhiteSpace(logWorksheet.Cell(logRow, logColumn).GetString()));
            },
            cancellationToken);

    public Task<LogEntryDto> UpdateAsync(
        string memberName,
        DateOnly date,
        UpdateLogEntryDto request,
        CancellationToken cancellationToken)
    {
        var attendance = AttendanceTypes.ValidateAndNormalize(request.Attendance);
        var logText = request.Log ?? string.Empty;

        logger.LogInformation(
            "Log kaydetme girişimi. Kullanıcı: {MemberName}, Tarih: {Date}",
            memberName,
            date);

        return excelService.ExecuteWriteAsync(
            workbook =>
            {
                var logWorksheet = schemaService.GetLogWorksheet(workbook);
                var attendanceWorksheet = schemaService.GetAttendanceWorksheet(workbook);

                var logColumn = schemaService.FindActiveMemberColumn(logWorksheet, memberName);
                var attendanceColumn = schemaService.FindActiveMemberColumn(attendanceWorksheet, memberName);
                var logRow = schemaService.EnsureDateRow(logWorksheet, date);
                var attendanceRow = schemaService.EnsureDateRow(attendanceWorksheet, date);
                var canonicalMemberName = logWorksheet.Cell(1, logColumn).GetString().Trim();

                var existingAttendance = attendanceWorksheet.Cell(attendanceRow, attendanceColumn).GetString().Trim();
                if (string.Equals(existingAttendance, AttendanceTypes.BankHoliday, StringComparison.OrdinalIgnoreCase))
                {
                    throw new BankHolidayLockedException(date);
                }

                WritePlainText(logWorksheet.Cell(logRow, logColumn), logText);
                WritePlainText(attendanceWorksheet.Cell(attendanceRow, attendanceColumn), attendance);

                logger.LogInformation(
                    "Log başarıyla kaydedildi. Kullanıcı: {MemberName}, Tarih: {Date}",
                    canonicalMemberName,
                    date);

                return new LogEntryDto(canonicalMemberName, date, attendance, logText);
            },
            cancellationToken);
    }

    /// <summary>
    /// Admin-only correction path: writes log + attendance for any date,
    /// bypassing the Bank Holiday lock that still applies to a member's own
    /// edits via <see cref="UpdateAsync"/> - used to fix mistakes from the
    /// Attendance page, including on auto-filled holiday rows.
    /// </summary>
    public Task<LogEntryDto> AdminUpdateAsync(
        string memberName,
        DateOnly date,
        UpdateLogEntryDto request,
        CancellationToken cancellationToken)
    {
        var attendance = AttendanceTypes.ValidateAndNormalize(request.Attendance);
        var logText = request.Log ?? string.Empty;

        logger.LogInformation(
            "Admin log düzenleme girişimi. Kullanıcı: {MemberName}, Tarih: {Date}",
            memberName,
            date);

        return excelService.ExecuteWriteAsync(
            workbook =>
            {
                var logWorksheet = schemaService.GetLogWorksheet(workbook);
                var attendanceWorksheet = schemaService.GetAttendanceWorksheet(workbook);

                var logColumn = schemaService.FindActiveMemberColumn(logWorksheet, memberName);
                var attendanceColumn = schemaService.FindActiveMemberColumn(attendanceWorksheet, memberName);
                var logRow = schemaService.EnsureDateRow(logWorksheet, date);
                var attendanceRow = schemaService.EnsureDateRow(attendanceWorksheet, date);
                var canonicalMemberName = logWorksheet.Cell(1, logColumn).GetString().Trim();

                WritePlainText(logWorksheet.Cell(logRow, logColumn), logText);
                WritePlainText(attendanceWorksheet.Cell(attendanceRow, attendanceColumn), attendance);

                logger.LogInformation(
                    "Admin log güncellendi. Kullanıcı: {MemberName}, Tarih: {Date}",
                    canonicalMemberName,
                    date);

                return new LogEntryDto(canonicalMemberName, date, attendance, logText);
            },
            cancellationToken);
    }

    public Task<IReadOnlyList<LogEntryDto>> GetRangeAsync(
        string memberName,
        DateOnly startDate,
        DateOnly endDate,
        CancellationToken cancellationToken) =>
        excelService.ExecuteReadAsync<IReadOnlyList<LogEntryDto>>(
            workbook =>
            {
                var logWorksheet = schemaService.GetLogWorksheet(workbook);
                var attendanceWorksheet = schemaService.GetAttendanceWorksheet(workbook);

                var logColumn = schemaService.FindActiveMemberColumn(logWorksheet, memberName);
                var attendanceColumn = schemaService.FindActiveMemberColumn(attendanceWorksheet, memberName);
                var canonicalMemberName = logWorksheet.Cell(1, logColumn).GetString().Trim();

                var logRows = schemaService.GetDateRowsInRange(logWorksheet, startDate, endDate);
                var attendanceRows = schemaService.GetDateRowsInRange(attendanceWorksheet, startDate, endDate);

                var entries = new List<LogEntryDto>();
                foreach (var (date, logRow) in logRows.OrderBy(item => item.Key))
                {
                    var attendance = attendanceRows.TryGetValue(date, out var attendanceRow)
                        ? NullIfWhiteSpace(attendanceWorksheet.Cell(attendanceRow, attendanceColumn).GetString())
                        : null;

                    entries.Add(new LogEntryDto(
                        canonicalMemberName,
                        date,
                        attendance,
                        NullIfWhiteSpace(logWorksheet.Cell(logRow, logColumn).GetString())));
                }

                return entries;
            },
            cancellationToken);

    public Task<IReadOnlyList<DailyLogEntryDto>> GetDailyAsync(
        DateOnly date,
        CancellationToken cancellationToken) =>
        excelService.ExecuteReadAsync<IReadOnlyList<DailyLogEntryDto>>(
            workbook =>
            {
                var logWorksheet = schemaService.GetLogWorksheet(workbook);
                var attendanceWorksheet = schemaService.GetAttendanceWorksheet(workbook);
                var members = schemaService.GetActiveMembers(logWorksheet);
                var logRow = schemaService.FindDateRow(logWorksheet, date);
                var attendanceRow = schemaService.FindDateRow(attendanceWorksheet, date);

                var entries = new List<DailyLogEntryDto>(members.Count);
                foreach (var member in members)
                {
                    var logColumn = schemaService.FindActiveMemberColumn(logWorksheet, member.Name);
                    var attendanceColumn = schemaService.FindActiveMemberColumn(attendanceWorksheet, member.Name);

                    entries.Add(new DailyLogEntryDto(
                        member.Name,
                        NullIfWhiteSpace(attendanceWorksheet.Cell(attendanceRow, attendanceColumn).GetString()),
                        NullIfWhiteSpace(logWorksheet.Cell(logRow, logColumn).GetString())));
                }

                return entries;
            },
            cancellationToken);

    private static string? NullIfWhiteSpace(string value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void WritePlainText(ClosedXML.Excel.IXLCell cell, string value)
    {
        cell.FormulaA1 = string.Empty;
        cell.SetValue(value);
    }
}
