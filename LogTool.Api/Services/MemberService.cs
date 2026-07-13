using LogTool.Api.Exceptions;
using LogTool.Api.Models;

namespace LogTool.Api.Services;

public sealed class MemberService(
    ExcelService excelService,
    ExcelSchemaService schemaService)
{
    public Task<IReadOnlyList<MemberDto>> GetActiveMembersAsync(CancellationToken cancellationToken) =>
        excelService.ExecuteReadAsync(
            workbook => schemaService.GetActiveMembers(schemaService.GetLogWorksheet(workbook)),
            cancellationToken);

    public Task<MemberDto> AddMemberAsync(string memberName, CancellationToken cancellationToken)
    {
        var trimmedName = memberName.Trim();
        if (string.IsNullOrWhiteSpace(trimmedName) || trimmedName.StartsWith('*'))
        {
            throw new InvalidMemberNameException();
        }

        return excelService.ExecuteWriteAsync(
            workbook =>
            {
                var logWorksheet = schemaService.GetLogWorksheet(workbook);
                var attendanceWorksheet = schemaService.GetAttendanceWorksheet(workbook);

                schemaService.EnsureMemberNameAvailable(logWorksheet, trimmedName);
                schemaService.EnsureMemberNameAvailable(attendanceWorksheet, trimmedName);

                var column = schemaService.AppendMemberColumn(logWorksheet, trimmedName);
                schemaService.AppendMemberColumn(attendanceWorksheet, trimmedName);

                return new MemberDto(trimmedName, true, column);
            },
            cancellationToken);
    }

    public Task DeactivateMemberAsync(string memberName, CancellationToken cancellationToken) =>
        excelService.ExecuteWriteAsync(
            workbook =>
            {
                var logWorksheet = schemaService.GetLogWorksheet(workbook);
                var attendanceWorksheet = schemaService.GetAttendanceWorksheet(workbook);

                schemaService.DeactivateMember(logWorksheet, memberName);
                schemaService.DeactivateMember(attendanceWorksheet, memberName);

                return true;
            },
            cancellationToken);
}
