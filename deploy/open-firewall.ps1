# Run this ON the target server as Administrator.
param(
    [int]$Port = 5443
)

New-NetFirewallRule -DisplayName "LogTool HTTPS" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow
Write-Host "Firewall rule added for inbound TCP port $Port."
