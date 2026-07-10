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
}
