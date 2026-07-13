# Run this on the DEV machine. Builds the frontend, publishes a
# self-contained backend, and bundles everything into .\publish
# ready to copy to the target server.

$root = Split-Path $PSScriptRoot -Parent
$webDir = Join-Path $root "LogTool.Web"
$apiDir = Join-Path $root "LogTool.Api"
$publishDir = Join-Path $root "publish"

Write-Host "Building frontend..."
Push-Location $webDir
npm install
npm run build
Pop-Location

Write-Host "Publishing backend (self-contained, win-x64)..."
if (Test-Path $publishDir) { Remove-Item $publishDir -Recurse -Force }
dotnet publish $apiDir -c Release -r win-x64 --self-contained true -o $publishDir

Write-Host "Copying Excel data file(s)..."
$dataSource = Join-Path $apiDir "Data"
$dataDest = Join-Path $publishDir "Data"
New-Item -ItemType Directory -Force -Path $dataDest | Out-Null
Get-ChildItem -Path $dataSource -Filter "*.xlsx" -ErrorAction SilentlyContinue | Copy-Item -Destination $dataDest

Write-Host ""
Write-Host "Done. Copy the '$publishDir' folder to the target server, then follow deploy/README.md."
