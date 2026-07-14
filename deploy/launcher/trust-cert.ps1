# Run this ON EACH USER'S PC (no admin rights needed) to make the browser
# fully trust the LogTool site's self-signed certificate.
#
# Without this, the site still loads after clicking through the "not
# secure" warning, but some browser features silently fail on an
# untrusted cert - notably Service Worker registration, which reminder
# notifications depend on.
#
# Usage (from this folder, next to LogTool-cert.cer):
#   powershell -ExecutionPolicy Bypass -File .\trust-cert.ps1

param(
    [string]$CertPath = (Join-Path $PSScriptRoot "LogTool-cert.cer")
)

if (-not (Test-Path $CertPath)) {
    throw "Certificate file not found at: $CertPath`nAsk your admin for the LogTool-cert.cer file (it sits next to this script)."
}

Import-Certificate -FilePath $CertPath -CertStoreLocation Cert:\CurrentUser\Root | Out-Null

Write-Host "Done. Close and reopen your browser, then open LogTool again."
Write-Host "The site should now show as fully secure, and reminder notifications will work."
