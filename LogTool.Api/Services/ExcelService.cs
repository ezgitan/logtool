using ClosedXML.Excel;
using LogTool.Api.Exceptions;
using LogTool.Api.Options;
using Microsoft.Extensions.Options;

namespace LogTool.Api.Services;

public sealed class ExcelService
{
    private static readonly SemaphoreSlim ExcelLock = new(1, 1);
    private readonly string _filePath;
    private readonly ILogger<ExcelService> _logger;

    public ExcelService(
        IOptions<ExcelOptions> options,
        IWebHostEnvironment environment,
        ILogger<ExcelService> logger)
    {
        var configuredPath = options.Value.FilePath;
        _filePath = Path.GetFullPath(
            Path.IsPathRooted(configuredPath)
                ? configuredPath
                : Path.Combine(environment.ContentRootPath, configuredPath));
        _logger = logger;
    }

    public async Task<T> ExecuteReadAsync<T>(
        Func<XLWorkbook, T> action,
        CancellationToken cancellationToken = default)
    {
        await ExcelLock.WaitAsync(cancellationToken);

        try
        {
            if (!File.Exists(_filePath))
            {
                throw new ExcelFileNotFoundException(_filePath);
            }

            _logger.LogInformation("Excel dosyası okunmak üzere açılıyor: {ExcelFileName}", Path.GetFileName(_filePath));
            using var workbook = new XLWorkbook(_filePath);
            return action(workbook);
        }
        catch (LogToolException)
        {
            throw;
        }
        catch (IOException exception)
        {
            _logger.LogWarning(exception, "Excel dosyasına erişilemedi: {ExcelFileName}", Path.GetFileName(_filePath));
            throw new ExcelFileLockedException();
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Excel dosyası okunamadı: {ExcelFileName}", Path.GetFileName(_filePath));
            throw;
        }
        finally
        {
            ExcelLock.Release();
        }
    }

    public async Task<T> ExecuteWriteAsync<T>(
        Func<XLWorkbook, T> action,
        CancellationToken cancellationToken = default)
    {
        await ExcelLock.WaitAsync(cancellationToken);

        try
        {
            if (!File.Exists(_filePath))
            {
                throw new ExcelFileNotFoundException(_filePath);
            }

            _logger.LogInformation("Excel dosyası yazılmak üzere açılıyor: {ExcelFileName}", Path.GetFileName(_filePath));
            using var workbook = new XLWorkbook(_filePath);
            var result = action(workbook);
            workbook.Save();
            return result;
        }
        catch (LogToolException)
        {
            throw;
        }
        catch (IOException exception)
        {
            _logger.LogWarning(exception, "Excel dosyasına yazılamadı: {ExcelFileName}", Path.GetFileName(_filePath));
            throw new ExcelFileLockedException();
        }
        catch (UnauthorizedAccessException exception)
        {
            _logger.LogWarning(exception, "Excel dosyasına yazma erişimi reddedildi: {ExcelFileName}", Path.GetFileName(_filePath));
            throw new ExcelFileLockedException();
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Excel dosyası kaydedilemedi: {ExcelFileName}", Path.GetFileName(_filePath));
            throw new LogSaveException();
        }
        finally
        {
            ExcelLock.Release();
        }
    }
}
