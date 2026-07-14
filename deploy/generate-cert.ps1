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

# Built via certreq + an INF template rather than New-SelfSignedCertificate's
# -TextExtension, which produced a malformed Subject Alternative Name
# extension on this server (Chrome rejected it outright with
# NET::ERR_CERT_INVALID / "scrambled credentials"). This certreq-based
# recipe is the long-documented, more portable way to get an IP-typed SAN.
$parsedIp = $null
$isIpAddress = [System.Net.IPAddress]::TryParse($HostName, [ref]$parsedIp)
$sanLine = if ($isIpAddress) { "ipaddress=$HostName" } else { "dns=$HostName" }

$workDir = Join-Path $env:TEMP "logtool-cert-$([Guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $workDir | Out-Null
$infPath = Join-Path $workDir "request.inf"
$cerPath = Join-Path $workDir "cert.cer"

@"
[Version]
Signature = "`$Windows NT`$"

[NewRequest]
Subject = "CN=$HostName"
KeySpec = 1
KeyLength = 2048
Exportable = TRUE
FriendlyName = "$friendlyName"
MachineKeySet = TRUE
SMIME = FALSE
PrivateKeyArchive = FALSE
UserProtected = FALSE
UseExistingKeySet = FALSE
ProviderName = "Microsoft RSA SChannel Cryptographic Provider"
ProviderType = 12
RequestType = Cert
KeyUsage = 0xa0
HashAlgorithm = SHA256
ValidityPeriod = Years
ValidityPeriodUnits = 5

[EnhancedKeyUsageExtension]
OID = 1.3.6.1.5.5.7.3.1

[Extensions]
2.5.29.17 = "{text}"
_continue_ = "$sanLine&"
"@ | Set-Content -Path $infPath -Encoding ASCII

certreq -new -q $infPath $cerPath | Out-Null

$cert = Get-ChildItem "cert:\LocalMachine\My" |
    Where-Object { $_.FriendlyName -eq $friendlyName } |
    Sort-Object NotBefore -Descending |
    Select-Object -First 1

Remove-Item $workDir -Recurse -Force -ErrorAction SilentlyContinue

if (-not $cert) {
    throw "Certificate creation failed - re-run 'certreq -new request.inf cert.cer' manually (without -q) to see the underlying error."
}

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
