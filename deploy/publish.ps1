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

Write-Host "Cleaning previous build output (avoids stale MSBuild incremental cache)..."
if (Test-Path $publishDir) { Remove-Item $publishDir -Recurse -Force }
Get-ChildItem -Path $apiDir -Include bin, obj -Recurse -Directory -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Publishing backend (self-contained, win-x64)..."
dotnet publish $apiDir -c Release -r win-x64 --self-contained true -o $publishDir
if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed with exit code $LASTEXITCODE" }

# Belt-and-suspenders: MSBuild's content-file copy has been seen to carry a
# stale appsettings.Production.json into the output, so force the current
# source version over whatever publish produced.
Copy-Item -Path (Join-Path $apiDir "appsettings.Production.json") -Destination $publishDir -Force

Write-Host "Copying Excel data file(s)..."
$dataSource = Join-Path $apiDir "Data"
$dataDest = Join-Path $publishDir "Data"
New-Item -ItemType Directory -Force -Path $dataDest | Out-Null
Get-ChildItem -Path $dataSource -Filter "*.xlsx" -ErrorAction SilentlyContinue | Copy-Item -Destination $dataDest

Write-Host ""
Write-Host "Done. Copy the '$publishDir' folder to the target server, then follow deploy/README.md."
