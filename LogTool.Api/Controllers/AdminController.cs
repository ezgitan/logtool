using LogTool.Api.Models;
using LogTool.Api.Options;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace LogTool.Api.Controllers;

[ApiController]
[Route("api/admin")]
public sealed class AdminController(IOptions<ExcelOptions> excelOptions) : ControllerBase
{
    [HttpGet("excel-link")]
    [ProducesResponseType<ExcelLinkDto>(StatusCodes.Status200OK)]
    public ActionResult<ExcelLinkDto> GetExcelLink() =>
        Ok(new ExcelLinkDto(excelOptions.Value.NetworkOpenUrl));
}
