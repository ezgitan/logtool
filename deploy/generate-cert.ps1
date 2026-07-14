# Run this ON the target server (10.96.250.14), as Administrator.
# Example: .\generate-cert.ps1
# Example (different port): .\generate-cert.ps1 -Port 5443

param(
    [string]$HostName = "10.96.250.14",
    [int]$Port = 443
)

# HTTP.sys (used instead of Kestrel so Windows Integrated Authentication
# works reliably) binds certificates at the OS level via netsh, not through
# a .pfx file read by the app — so this installs the cert into the machine
# store and registers it with HTTP.sys directly.

$friendlyName = "LogTool self-signed certificate"

# Clean up certs from previous runs of this script so they don't pile up in
# the store (setup.vbs matches by the thumbprint netsh has bound, not by
# name, so stale duplicates here are just clutter - but worth avoiding).
Get-ChildItem "cert:\LocalMachine\My" |
    Where-Object { $_.FriendlyName -eq $friendlyName } |
    Remove-Item -Force -ErrorAction SilentlyContinue

# -DnsName's automatic IP-vs-hostname detection isn't reliable on every
# Windows version - it can silently add the IP as a "DNS Name" SAN entry
# instead of an "IP Address" one. Chromium browsers require the latter to
# accept a certificate when connecting via IP literal, so build the SAN
# extension explicitly to guarantee the right type.
$parsedIp = $null
$isIpAddress = [System.Net.IPAddress]::TryParse($HostName, [ref]$parsedIp)
$sanExtension = if ($isIpAddress) { "2.5.29.17={text}IPAddress=$HostName" } else { "2.5.29.17={text}DNS=$HostName" }

$cert = New-SelfSignedCertificate `
    -CertStoreLocation "cert:\LocalMachine\My" `
    -NotAfter (Get-Date).AddYears(5) `
    -FriendlyName $friendlyName `
    -TextExtension @($sanExtension)

$thumbprint = $cert.Thumbprint
$appId = "{2f6a6b0e-1c6a-4b1a-9b1a-1234567890ab}"

# Remove any previous binding on this port so re-running this script is safe.
netsh http delete sslcert ipport=0.0.0.0:$Port 2>$null | Out-Null

netsh http add sslcert ipport=0.0.0.0:$Port certhash=$thumbprint appid=$appId | Out-Null

# Export the public certificate (no private key) so it can be distributed to
# client PCs and trusted there — needed for Service Worker registration
# (push notification reminders), which browsers block on self-signed certs
# even after the user clicks through the "not secure" warning.
$exportDir = Join-Path $PSScriptRoot "launcher"
if (-not (Test-Path $exportDir)) { New-Item -ItemType Directory -Path $exportDir | Out-Null }
$exportPath = Join-Path $exportDir "LogTool-cert.cer"
Export-Certificate -Cert $cert -FilePath $exportPath | Out-Null

Write-Host ""
Write-Host "Certificate created and bound to 0.0.0.0:$Port"
Write-Host "Thumbprint: $thumbprint"
Write-Host "Valid for: $HostName (5 years)"
Write-Host ""
Write-Host "Public certificate exported to: $exportPath"
Write-Host "Distribute this .cer file (see deploy/launcher/README.md) so each"
Write-Host "user's browser fully trusts the site - required for reminder"
Write-Host "notifications to work, and removes the 'not secure' warning too."
