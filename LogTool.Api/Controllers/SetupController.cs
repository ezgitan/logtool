using System.Security.Cryptography.X509Certificates;
using System.Text;
using Microsoft.AspNetCore.Mvc;

namespace LogTool.Api.Controllers;

/// <summary>
/// Serves a self-contained VBScript that, run once on a user's own PC, trusts
/// this server's certificate (if self-signed) and opens the site signed in
/// via "whoami /upn" - no separate file distribution needed, since the
/// script is downloaded directly from the site itself.
/// </summary>
[ApiController]
[Route("setup.vbs")]
public sealed class SetupController : ControllerBase
{
    private const string CertificateFriendlyName = "LogTool self-signed certificate";

    [HttpGet]
    public IActionResult Get()
    {
        var certBase64 = FindCertificateBase64();
        var siteUrl = $"{Request.Scheme}://{Request.Host}/";
        var bytes = Encoding.ASCII.GetBytes(BuildScript(certBase64, siteUrl));
        return File(bytes, "application/octet-stream", "Setup LogTool.vbs");
    }

    private static string? FindCertificateBase64()
    {
        using var store = new X509Store(StoreName.My, StoreLocation.LocalMachine);
        store.Open(OpenFlags.ReadOnly);
        var cert = store.Certificates
            .OfType<X509Certificate2>()
            .FirstOrDefault(c => c.FriendlyName == CertificateFriendlyName);
        return cert is null ? null : Convert.ToBase64String(cert.Export(X509ContentType.Cert));
    }

    private static string BuildScript(string? certBase64, string siteUrl)
    {
        var sb = new StringBuilder();
        sb.AppendLine("' LogTool one-time setup. Trusts the site certificate (if needed) and");
        sb.AppendLine("' opens LogTool signed in as you. Safe to run again any time.");
        sb.AppendLine();
        sb.AppendLine($"siteUrl = \"{siteUrl}\"");
        sb.AppendLine();
        sb.AppendLine("Set shell = CreateObject(\"WScript.Shell\")");
        sb.AppendLine("Set fso = CreateObject(\"Scripting.FileSystemObject\")");
        sb.AppendLine();

        if (certBase64 is not null)
        {
            AppendCertTrustBlock(sb, certBase64);
        }

        sb.AppendLine("whoamiTemp = fso.GetSpecialFolder(2) & \"\\\" & fso.GetTempName()");
        sb.AppendLine("shell.Run \"%comspec% /c whoami /upn > \"\"\" & whoamiTemp & \"\"\" 2>nul\", 0, True");
        sb.AppendLine();
        sb.AppendLine("upn = \"\"");
        sb.AppendLine("If fso.FileExists(whoamiTemp) Then");
        sb.AppendLine("    Set f = fso.OpenTextFile(whoamiTemp, 1)");
        sb.AppendLine("    If Not f.AtEndOfStream Then upn = Trim(f.ReadLine)");
        sb.AppendLine("    f.Close");
        sb.AppendLine("    fso.DeleteFile whoamiTemp, True");
        sb.AppendLine("End If");
        sb.AppendLine();
        sb.AppendLine("If upn = \"\" Then");
        sb.AppendLine("    MsgBox \"Could not determine your Windows account. Make sure this PC is signed in to the company domain.\", vbExclamation, \"LogTool\"");
        sb.AppendLine("Else");
        sb.AppendLine("    shell.Run siteUrl & \"?identity=\" & upn, 1, False");
        sb.AppendLine("End If");

        return sb.ToString();
    }

    private static void AppendCertTrustBlock(StringBuilder sb, string certBase64)
    {
        sb.AppendLine("certB64 = \"\"");
        foreach (var chunk in Chunk(certBase64, 100))
        {
            sb.AppendLine($"certB64 = certB64 & \"{chunk}\"");
        }
        sb.AppendLine();
        sb.AppendLine("Function Base64Decode(b64)");
        sb.AppendLine("    Dim xml, node");
        sb.AppendLine("    Set xml = CreateObject(\"Msxml2.DOMDocument.6.0\")");
        sb.AppendLine("    Set node = xml.CreateElement(\"b64\")");
        sb.AppendLine("    node.DataType = \"bin.base64\"");
        sb.AppendLine("    node.Text = b64");
        sb.AppendLine("    Base64Decode = node.NodeTypedValue");
        sb.AppendLine("End Function");
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
