# Run this ON the target server (10.96.250.14), as Administrator.
# Example: .\generate-cert.ps1
# Example (different port): .\generate-cert.ps1 -Port 5443

param(
    [string]$HostName = "10.96.250.14",
    [int]$Port = 5443
)

# HTTP.sys (used instead of Kestrel so Windows Integrated Authentication
# works reliably) binds certificates at the OS level via netsh, not through
# a .pfx file read by the app — so this installs the cert into the machine
# store and registers it with HTTP.sys directly.

$cert = New-SelfSignedCertificate `
    -DnsName $HostName `
    -CertStoreLocation "cert:\LocalMachine\My" `
    -NotAfter (Get-Date).AddYears(5) `
    -FriendlyName "LogTool self-signed certificate"

$thumbprint = $cert.Thumbprint
$appId = "{2f6a6b0e-1c6a-4b1a-9b1a-1234567890ab}"

# Remove any previous binding on this port so re-running this script is safe.
netsh http delete sslcert ipport=0.0.0.0:$Port 2>$null | Out-Null

netsh http add sslcert ipport=0.0.0.0:$Port certhash=$thumbprint appid=$appId | Out-Null

Write-Host ""
Write-Host "Certificate created and bound to 0.0.0.0:$Port"
Write-Host "Thumbprint: $thumbprint"
Write-Host "Valid for: $HostName (5 years)"
Write-Host ""
Write-Host "No further certificate setup needed — HTTP.sys will pick this up automatically."
