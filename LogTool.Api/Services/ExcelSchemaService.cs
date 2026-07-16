using ClosedXML.Excel;
using LogTool.Api.Exceptions;
using LogTool.Api.Models;
using LogTool.Api.Options;
using Microsoft.Extensions.Options;

namespace LogTool.Api.Services;

public sealed class ExcelSchemaService(IOptions<ExcelOptions> options)
{
    private readonly ExcelOptions _options = options.Value;

    public IXLWorksheet GetLogWorksheet(XLWorkbook workbook) =>
        GetWorksheet(workbook, _options.LogWorksheet);

    public IXLWorksheet GetAttendanceWorksheet(XLWorkbook workbook) =>
        GetWorksheet(workbook, _options.AttendanceWorksheet);

    public IReadOnlyList<MemberDto> GetActiveMembers(IXLWorksheet worksheet)
    {
        var lastColumn = worksheet.Row(_options.HeaderRow).LastCellUsed()?.Address.ColumnNumber
            ?? _options.FirstMemberColumn - 1;
        var members = new List<MemberDto>();

        for (var column = _options.FirstMemberColumn; column <= lastColumn; column++)
        {
            var rawName = worksheet.Cell(_options.HeaderRow, column).GetString().Trim();
            if (string.IsNullOrWhiteSpace(rawName) || rawName.StartsWith('*'))
            {
                continue;
            }

            members.Add(new MemberDto(rawName, true, members.Count + 1));
        }

        return members;
    }

    public int FindActiveMemberColumn(IXLWorksheet worksheet, string memberName)
    {
        var normalizedMemberName = memberName.Trim();
        var lastColumn = worksheet.Row(_options.HeaderRow).LastCellUsed()?.Address.ColumnNumber
            ?? _options.FirstMemberColumn - 1;

        for (var column = _options.FirstMemberColumn; column <= lastColumn; column++)
        {
            var excelName = worksheet.Cell(_options.HeaderRow, column).GetString().Trim();
            var comparableName = excelName.TrimStart('*').Trim();
            if (!string.Equals(comparableName, normalizedMemberName, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (excelName.StartsWith('*'))
            {
                throw new InactiveMemberException(normalizedMemberName);
            }

            return column;
        }

        throw new MemberNotFoundException(normalizedMemberName);
    }

    public void EnsureMemberNameAvailable(IXLWorksheet worksheet, string memberName)
    {
        var lastColumn = worksheet.Row(_options.HeaderRow).LastCellUsed()?.Address.ColumnNumber
            ?? _options.FirstMemberColumn - 1;

        for (var column = _options.FirstMemberColumn; column <= lastColumn; column++)
        {
            var comparableName = worksheet.Cell(_options.HeaderRow, column).GetString().Trim().TrimStart('*').Trim();
            if (string.Equals(comparableName, memberName, StringComparison.OrdinalIgnoreCase))
            {
                throw new MemberAlreadyExistsException(memberName);
            }
        }
    }

    public int AppendMemberColumn(IXLWorksheet worksheet, string memberName)
    {
        var lastColumn = worksheet.Row(_options.HeaderRow).LastCellUsed()?.Address.ColumnNumber
            ?? _options.FirstMemberColumn - 1;
        var newColumn = Math.Max(lastColumn + 1, _options.FirstMemberColumn);

        var headerCell = worksheet.Cell(_options.HeaderRow, newColumn);
        if (lastColumn >= _options.FirstMemberColumn)
        {
            headerCell.CopyFrom(worksheet.Cell(_options.HeaderRow, lastColumn));
        }

        headerCell.SetValue(memberName);
        return newColumn;
    }

    public void DeactivateMember(IXLWorksheet worksheet, string memberName)
    {
        var normalizedMemberName = memberName.Trim();
        var lastColumn = worksheet.Row(_options.HeaderRow).LastCellUsed()?.Address.ColumnNumber
            ?? _options.FirstMemberColumn - 1;

        for (var column = _options.FirstMemberColumn; column <= lastColumn; column++)
        {
            var cell = worksheet.Cell(_options.HeaderRow, column);
            var excelName = cell.GetString().Trim();
            var comparableName = excelName.TrimStart('*').Trim();

            if (!string.Equals(comparableName, normalizedMemberName, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (!excelName.StartsWith('*'))
            {
                cell.SetValue("*" + comparableName);
            }

            return;
        }

        throw new MemberNotFoundException(normalizedMemberName);
    }

    public int FindDateRow(IXLWorksheet worksheet, DateOnly date)
    {
        var lastRow = worksheet.Column(_options.DateColumn).LastCellUsed()?.Address.RowNumber
            ?? _options.HeaderRow;

        for (var row = _options.HeaderRow + 1; row <= lastRow; row++)
        {
            if (TryReadDate(worksheet.Cell(row, _options.DateColumn), out var cellDate) && cellDate == date)
            {
                return row;
            }
        }

        throw new DateNotFoundException(date, worksheet.Name);
    }

    public IReadOnlyDictionary<DateOnly, int> GetDateRows(IXLWorksheet worksheet)
    {
        var lastRow = worksheet.Column(_options.DateColumn).LastCellUsed()?.Address.RowNumber
            ?? _options.HeaderRow;
        var rows = new Dictionary<DateOnly, int>();

        for (var row = _options.HeaderRow + 1; row <= lastRow; row++)
        {
            if (TryReadDate(worksheet.Cell(row, _options.DateColumn), out var date))
            {
                rows[date] = row;
            }
        }

        return rows;
    }

    /// <summary>
    /// Same idea as <see cref="GetDateRows"/> but scoped to one month, and much
    /// cheaper on long-running sheets: date rows are always appended in
    /// chronological order (see <see cref="EnsureDateRow"/>), so scanning
    /// backward from the last row and stopping as soon as we pass the start
    /// of the target month reads only that month's rows instead of the
    /// entire history of the workbook.
    /// </summary>
    public IReadOnlyDictionary<DateOnly, int> GetDateRowsInMonth(IXLWorksheet worksheet, int year, int month)
    {
        var lastRow = worksheet.Column(_options.DateColumn).LastCellUsed()?.Address.RowNumber
            ?? _options.HeaderRow;
        var rows = new Dictionary<DateOnly, int>();

        for (var row = lastRow; row > _options.HeaderRow; row--)
        {
            if (!TryReadDate(worksheet.Cell(row, _options.DateColumn), out var date))
            {
                continue;
            }

            if (date.Year < year || (date.Year == year && date.Month < month))
            {
                break;
            }

            if (date.Year == year && date.Month == month)
            {
                rows[date] = row;
            }
        }

        return rows;
    }

    public int EnsureDateRow(IXLWorksheet worksheet, DateOnly date)
    {
        var existingRows = GetDateRows(worksheet);
        if (existingRows.TryGetValue(date, out var existingRow))
        {
            return existingRow;
        }

        var lastRow = worksheet.Column(_options.DateColumn).LastCellUsed()?.Address.RowNumber
            ?? _options.HeaderRow;
        var newRow = lastRow + 1;
        var newDateCell = worksheet.Cell(newRow, _options.DateColumn);

        if (lastRow > _options.HeaderRow)
        {
            newDateCell.CopyFrom(worksheet.Cell(lastRow, _options.DateColumn));
        }

        newDateCell.SetValue(date.ToDateTime(TimeOnly.MinValue));
        return newRow;
    }

    private static bool TryReadDate(IXLCell cell, out DateOnly date)
    {
        if (cell.TryGetValue<DateTime>(out var dateTime))
        {
            date = DateOnly.FromDateTime(dateTime);
            return true;
        }

        if (cell.TryGetValue<double>(out var serialDate))
        {
            date = DateOnly.FromDateTime(DateTime.FromOADate(serialDate));
            return true;
        }

        date = default;
        return false;
    }

    private static IXLWorksheet GetWorksheet(XLWorkbook workbook, string worksheetName)
    {
        if (workbook.TryGetWorksheet(worksheetName, out var worksheet))
        {
            return worksheet;
        }

        throw new WorksheetNotFoundException(worksheetName);
    }
}
