using System.Diagnostics;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.RegularExpressions;
using LogTool.Api.Models;
using LogTool.Api.Options;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace LogTool.Api.Controllers;

/// <summary>
/// Serves a self-contained VBScript that, run once on a user's own PC, trusts
/// this server's certificate (if self-signed) and opens the site signed in
/// via "whoami /upn" - no separate file distribution needed, since the
/// script is downloaded directly from the site itself.
/// </summary>
[ApiController]
[Route("setup.vbs")]
public sealed class SetupController(IOptions<ExcelOptions> excelOptions) : ControllerBase
{
    /// <summary>
    /// Bump this whenever BuildScript's logic changes meaningfully. The
    /// frontend compares this against the version a person last completed
    /// setup with and forces a re-run of setup.vbs on mismatch - so nobody
    /// has to be told to manually clear browser storage after an update.
    /// </summary>
    public const string ScriptVersion = "3.0.0";

    [HttpGet]
    public IActionResult Get()
    {
        Response.Headers.CacheControl = "no-store";

        var port = Request.Host.Port ?? (Request.IsHttps ? 443 : 80);
        var certBase64 = FindCertificateBase64(port);
        var siteUrl = $"{Request.Scheme}://{Request.Host}/";
        var bytes = Encoding.ASCII.GetBytes(BuildScript(certBase64, siteUrl, ScriptVersion, excelOptions.Value.NetworkPath));
        return File(bytes, "application/octet-stream", "Setup LogTool.vbs");
    }

    [HttpGet("/api/setup/version")]
    [ProducesResponseType<SetupVersionDto>(StatusCodes.Status200OK)]
    public ActionResult<SetupVersionDto> GetVersion()
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(new SetupVersionDto(ScriptVersion));
    }

    /// <summary>
    /// Finds the certificate actually bound to HTTP.sys via netsh (there can be
    /// several self-signed certs sitting in the store from re-running
    /// generate-cert.ps1 over time - matching by thumbprint, not friendly name,
    /// guarantees we embed the one the browser is really seeing).
    /// </summary>
    private static string? FindCertificateBase64(int port)
    {
        var thumbprint = GetBoundThumbprint(port);
        if (thumbprint is null) return null;

        using var store = new X509Store(StoreName.My, StoreLocation.LocalMachine);
        store.Open(OpenFlags.ReadOnly);
        var matches = store.Certificates.Find(X509FindType.FindByThumbprint, thumbprint, validOnly: false);
        var cert = matches.OfType<X509Certificate2>().FirstOrDefault();
        return cert is null ? null : Convert.ToBase64String(cert.Export(X509ContentType.Cert));
    }

    private static string? GetBoundThumbprint(int port)
    {
        var startInfo = new ProcessStartInfo("netsh", $"http show sslcert ipport=0.0.0.0:{port}")
        {
            RedirectStandardOutput = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        using var process = Process.Start(startInfo);
        if (process is null) return null;

        var output = process.StandardOutput.ReadToEnd();
        process.WaitForExit();

        // netsh's field labels are localized (e.g. not "Certificate Hash" on a
        // non-English Windows install), so look for the value itself instead:
        // a SHA-1 thumbprint is a contiguous 40-character hex string, which
        // nothing else in this output (IP:port, GUID app id, store name) matches.
        var match = Regex.Match(output, "[0-9a-fA-F]{40}");
        return match.Success ? match.Value : null;
    }

    private static string BuildScript(string? certBase64, string siteUrl, string scriptVersion, string? excelNetworkPath)
    {
        var sb = new StringBuilder();
        sb.AppendLine("' LogTool one-time setup. Trusts the site certificate (if needed) and");
        sb.AppendLine("' opens LogTool signed in as you. Safe to run again any time.");
        sb.AppendLine();
        sb.AppendLine("Set shell = CreateObject(\"WScript.Shell\")");
        sb.AppendLine("Set fso = CreateObject(\"Scripting.FileSystemObject\")");
        sb.AppendLine();
        sb.AppendLine("' Diagnostic log - lets us see exactly what happened at each step.");
        sb.AppendLine("logPath = shell.SpecialFolders(\"Desktop\") & \"\\LogTool-setup-log.txt\"");
        sb.AppendLine("Sub LogMsg(msg)");
        sb.AppendLine("    On Error Resume Next");
        sb.AppendLine("    Dim logFile");
        sb.AppendLine("    Set logFile = fso.OpenTextFile(logPath, 8, True)");
        sb.AppendLine("    logFile.WriteLine Now & \" - \" & msg");
        sb.AppendLine("    logFile.Close");
        sb.AppendLine("    On Error Goto 0");
        sb.AppendLine("End Sub");
        sb.AppendLine();
        sb.AppendLine("LogMsg \"=== Setup started ===\"");
        sb.AppendLine();
        sb.AppendLine($"siteUrl = \"{siteUrl}\"");
        sb.AppendLine();

        AppendBase64DecodeFunction(sb);

        if (certBase64 is not null)
        {
            sb.AppendLine("LogMsg \"Certificate found on server - trusting it locally...\"");
            AppendCertTrustBlock(sb, certBase64);
            sb.AppendLine("LogMsg \"Certificate trust step done.\"");
            sb.AppendLine();
        }
        else
        {
            sb.AppendLine("LogMsg \"No self-signed certificate reported by server - skipping trust step.\"");
            sb.AppendLine();
        }

        if (excelNetworkPath is not null)
        {
            AppendExcelProtocolHandlerBlock(sb, excelNetworkPath);
        }
        else
        {
            sb.AppendLine("LogMsg \"No Excel network path configured on server - skipping logtoolexcel: link handler.\"");
            sb.AppendLine();
        }

        sb.AppendLine("Function GetUpn()");
        sb.AppendLine("    Dim whoamiTemp, f, result");
        sb.AppendLine("    whoamiTemp = fso.GetSpecialFolder(2) & \"\\\" & fso.GetTempName()");
        sb.AppendLine("    shell.Run \"%comspec% /c whoami /upn > \"\"\" & whoamiTemp & \"\"\" 2>nul\", 0, True");
        sb.AppendLine("    result = \"\"");
        sb.AppendLine("    If fso.FileExists(whoamiTemp) Then");
        sb.AppendLine("        Set f = fso.OpenTextFile(whoamiTemp, 1)");
        sb.AppendLine("        If Not f.AtEndOfStream Then result = Trim(f.ReadLine)");
        sb.AppendLine("        f.Close");
        sb.AppendLine("        fso.DeleteFile whoamiTemp, True");
        sb.AppendLine("    Else");
        sb.AppendLine("        LogMsg \"whoami: output file was never created\"");
        sb.AppendLine("    End If");
        sb.AppendLine("    GetUpn = result");
        sb.AppendLine("End Function");
        sb.AppendLine();
        sb.AppendLine("' Runs whoami in a cmd window elevated via UAC (runas). Needed because");
        sb.AppendLine("' the company's admin-access grant doesn't carry over to this script's");
        sb.AppendLine("' own already-running process or its plain child processes - only a fresh");
        sb.AppendLine("' elevated process picks up the new permissions.");
        sb.AppendLine("Function GetUpnElevated()");
        sb.AppendLine("    Dim whoamiTemp, f, result, waited, uacShell");
        sb.AppendLine("    result = \"\"");
        sb.AppendLine("    On Error Resume Next");
        sb.AppendLine("    whoamiTemp = fso.GetSpecialFolder(2) & \"\\\" & fso.GetTempName()");
        sb.AppendLine("    Set uacShell = CreateObject(\"Shell.Application\")");
        sb.AppendLine("    uacShell.ShellExecute \"cmd.exe\", \"/c whoami /upn > \"\"\" & whoamiTemp & \"\"\" 2>nul\", \"\", \"runas\", 0");
        sb.AppendLine("    If Err.Number <> 0 Then LogMsg \"Elevated whoami launch raised an error: \" & Err.Number & \" - \" & Err.Description");
        sb.AppendLine("    waited = 0");
        sb.AppendLine("    Do While Not fso.FileExists(whoamiTemp) And waited < 15");
        sb.AppendLine("        WScript.Sleep 1000");
        sb.AppendLine("        waited = waited + 1");
        sb.AppendLine("    Loop");
        sb.AppendLine("    If fso.FileExists(whoamiTemp) Then");
        sb.AppendLine("        Set f = fso.OpenTextFile(whoamiTemp, 1)");
        sb.AppendLine("        If Not f.AtEndOfStream Then result = Trim(f.ReadLine)");
        sb.AppendLine("        f.Close");
        sb.AppendLine("        fso.DeleteFile whoamiTemp, True");
        sb.AppendLine("    Else");
        sb.AppendLine("        LogMsg \"Elevated whoami: output file never appeared after \" & waited & \"s\"");
        sb.AppendLine("    End If");
        sb.AppendLine("    On Error Goto 0");
        sb.AppendLine("    GetUpnElevated = result");
        sb.AppendLine("End Function");
        sb.AppendLine();
        sb.AppendLine("LogMsg \"Trying whoami without elevation...\"");
        sb.AppendLine("upn = GetUpn()");
        sb.AppendLine("LogMsg \"First whoami result: '\" & upn & \"'\"");
        sb.AppendLine();
        sb.AppendLine("' whoami works without elevation on most PCs - only fall back to the");
        sb.AppendLine("' company's elevation shortcut (and retry once) on the ones where it doesn't,");
        sb.AppendLine("' instead of always prompting for admin access up front.");
        sb.AppendLine("If upn = \"\" Then");
        sb.AppendLine("    LogMsg \"whoami failed - requesting admin access...\"");
        sb.AppendLine("    startTime = Timer");
        sb.AppendLine("    On Error Resume Next");
        sb.AppendLine("    psPath = fso.GetSpecialFolder(2) & \"\\\" & fso.GetTempName() & \".ps1\"");
        sb.AppendLine("    Set psFile = fso.CreateTextFile(psPath, True)");
        sb.AppendLine("    ' Not -Wait: don't block on the approval screen's own lifetime, which can");
        sb.AppendLine("    ' run well past the moment access is actually granted. The elevated whoami");
        sb.AppendLine("    ' below shows its own separate UAC prompt anyway, so there's nothing to");
        sb.AppendLine("    ' gain from waiting here - only fire the request and move on immediately.");
        sb.AppendLine("    psFile.WriteLine \"Start-Process \"\"$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\\Administrator Access.lnk\"\"\"");
        sb.AppendLine("    psFile.Close");
        sb.AppendLine("    shell.Run \"powershell -NoProfile -ExecutionPolicy Bypass -File \"\"\" & psPath & \"\"\"\", 0, True");
        sb.AppendLine("    fso.DeleteFile psPath, True");
        sb.AppendLine("    If Err.Number <> 0 Then LogMsg \"Admin access step raised an error: \" & Err.Number & \" - \" & Err.Description");
        sb.AppendLine("    On Error Goto 0");
        sb.AppendLine("    LogMsg \"Admin access requested (\" & Round(Timer - startTime, 1) & \"s to fire). Running whoami elevated now...\"");
        sb.AppendLine();
        sb.AppendLine("    ' A plain (non-elevated) whoami retry doesn't see the new admin access -");
        sb.AppendLine("    ' it inherits this script's original, still-unelevated process chain. Run");
        sb.AppendLine("    ' it in a freshly UAC-elevated cmd window instead, which does pick it up.");
        sb.AppendLine("    upn = GetUpnElevated()");
        sb.AppendLine("    LogMsg \"Elevated whoami result (\" & Round(Timer - startTime, 1) & \"s total): '\" & upn & \"'\"");
        sb.AppendLine("End If");
        sb.AppendLine();
        sb.AppendLine("If upn = \"\" Then");
        sb.AppendLine("    LogMsg \"FAILED - could not determine identity, showing error to user.\"");
        sb.AppendLine("    MsgBox \"Could not determine your Windows account. Make sure this PC is signed in to the company domain.\", vbExclamation, \"LogTool\"");
        sb.AppendLine("Else");
        sb.AppendLine("    LogMsg \"SUCCESS - opening site with identity '\" & upn & \"'\"");
        sb.AppendLine($"    shell.Run siteUrl & \"?identity=\" & upn & \"&setupVersion={scriptVersion}\", 1, False");
        sb.AppendLine("End If");
        sb.AppendLine();
        sb.AppendLine("LogMsg \"=== Setup finished ===\"");

        return sb.ToString();
    }

    private static void AppendBase64DecodeFunction(StringBuilder sb)
    {
        sb.AppendLine("Function Base64Decode(b64)");
        sb.AppendLine("    Dim xml, node");
        sb.AppendLine("    Set xml = CreateObject(\"Msxml2.DOMDocument.6.0\")");
        sb.AppendLine("    Set node = xml.CreateElement(\"b64\")");
        sb.AppendLine("    node.DataType = \"bin.base64\"");
        sb.AppendLine("    node.Text = b64");
        sb.AppendLine("    Base64Decode = node.NodeTypedValue");
        sb.AppendLine("End Function");
        sb.AppendLine();
    }

    /// <summary>
    /// Registers a per-user "logtoolexcel:" link handler (HKCU, no admin rights
    /// needed) so a plain &lt;a href="logtoolexcel:open"&gt; on the site can open
    /// the shared Excel file directly in Excel - browsers block navigation to
    /// file:// and UNC links from an https page, so this hands off to a small
    /// local script instead, which isn't subject to that restriction.
    /// </summary>
    private static void AppendExcelProtocolHandlerBlock(StringBuilder sb, string excelNetworkPath)
    {
        sb.AppendLine("LogMsg \"Registering the logtoolexcel: link handler...\"");
        sb.AppendLine("On Error Resume Next");
        sb.AppendLine();

        var openerScriptBuilder = new StringBuilder();
        openerScriptBuilder.AppendLine("Set shellObj = CreateObject(\"WScript.Shell\")");
        openerScriptBuilder.AppendLine($"shellObj.Run \"\"\"{excelNetworkPath}\"\"\", 1, False");
        var openerBase64 = Convert.ToBase64String(Encoding.ASCII.GetBytes(openerScriptBuilder.ToString()));

        sb.AppendLine("openerB64 = \"\"");
        foreach (var chunk in Chunk(openerBase64, 100))
        {
            sb.AppendLine($"openerB64 = openerB64 & \"{chunk}\"");
        }
        sb.AppendLine();
        sb.AppendLine("openerDir = shell.SpecialFolders(\"AppData\") & \"\\LogTool\"");
        sb.AppendLine("If Not fso.FolderExists(openerDir) Then fso.CreateFolder openerDir");
        sb.AppendLine("openerPath = openerDir & \"\\open-excel.vbs\"");
        sb.AppendLine();
        sb.AppendLine("Set openerStream = CreateObject(\"ADODB.Stream\")");
        sb.AppendLine("openerStream.Type = 1");
        sb.AppendLine("openerStream.Open");
        sb.AppendLine("openerStream.Write Base64Decode(openerB64)");
        sb.AppendLine("openerStream.SaveToFile openerPath, 2");
        sb.AppendLine("openerStream.Close");
        sb.AppendLine();
        sb.AppendLine("shell.RegWrite \"HKCU\\Software\\Classes\\logtoolexcel\\\", \"URL:LogTool Excel Opener\", \"REG_SZ\"");
        sb.AppendLine("shell.RegWrite \"HKCU\\Software\\Classes\\logtoolexcel\\URL Protocol\", \"\", \"REG_SZ\"");
        sb.AppendLine("shell.RegWrite \"HKCU\\Software\\Classes\\logtoolexcel\\shell\\open\\command\\\", \"wscript.exe //nologo \"\"\" & openerPath & \"\"\"\", \"REG_SZ\"");
        sb.AppendLine();
        sb.AppendLine("If Err.Number <> 0 Then LogMsg \"Excel link handler registration raised an error: \" & Err.Number & \" - \" & Err.Description");
        sb.AppendLine("On Error Goto 0");
        sb.AppendLine("LogMsg \"Excel link handler registration done.\"");
        sb.AppendLine();
    }

    private static void AppendCertTrustBlock(StringBuilder sb, string certBase64)
    {
        sb.AppendLine("certB64 = \"\"");
        foreach (var chunk in Chunk(certBase64, 100))
        {
            sb.AppendLine($"certB64 = certB64 & \"{chunk}\"");
        }
        sb.AppendLine();
        sb.AppendLine("certPath = fso.GetSpecialFolder(2) & \"\\\" & fso.GetTempName() & \".cer\"");
        sb.AppendLine("Set stream = CreateObject(\"ADODB.Stream\")");
        sb.AppendLine("stream.Type = 1");
        sb.AppendLine("stream.Open");
        sb.AppendLine("stream.Write Base64Decode(certB64)");
        sb.AppendLine("stream.SaveToFile certPath, 2");
        sb.AppendLine("stream.Close");
        sb.AppendLine();
        sb.AppendLine("shell.Run \"%comspec% /c certutil -addstore -user Root \"\"\" & certPath & \"\"\" >nul 2>&1\", 0, True");
        sb.AppendLine("fso.DeleteFile certPath, True");
        sb.AppendLine();
    }

    private static IEnumerable<string> Chunk(string value, int size)
    {
        for (var i = 0; i < value.Length; i += size)
        {
            yield return value.Substring(i, Math.Min(size, value.Length - i));
        }
    }
}
