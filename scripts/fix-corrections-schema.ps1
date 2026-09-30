# Run from backend folder: powershell -ExecutionPolicy Bypass -File scripts/fix-corrections-schema.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "`nStep 1: prisma generate" -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "prisma generate failed" }

Write-Host "`nStep 2: prisma db push" -ForegroundColor Cyan
npx prisma db push --accept-data-loss
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nAutomatic db push failed. Run prisma/manual-schema-sync.sql in MySQL Workbench, then run: npx prisma generate" -ForegroundColor Yellow
  exit 1
}

Write-Host "`nDone. Restart backend: npm run start:dev`n" -ForegroundColor Green
