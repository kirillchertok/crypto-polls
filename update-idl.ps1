# PowerShell script to rebuild contract and update IDL
# Run this from the project root directory

Write-Host "🔧 Updating Smart Contract IDL..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "contract")) {
    Write-Host "❌ Error: contract directory not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "client")) {
    Write-Host "❌ Error: client directory not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

# Step 1: Build the contract
Write-Host "Step 1: Building smart contract..." -ForegroundColor Yellow
Set-Location contract

try {
    $buildOutput = anchor build 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        Write-Host $buildOutput
        Set-Location ..
        exit 1
    }
    Write-Host "✅ Contract built successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Error building contract: $_" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

# Step 2: Check if IDL exists
$idlSource = "contract\target\idl\contract.json"
$idlDest = "client\src\idl\contract.json"

if (-not (Test-Path $idlSource)) {
    Write-Host "❌ IDL file not found at $idlSource" -ForegroundColor Red
    Write-Host "Make sure the contract built successfully." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Step 2: Copying IDL to client..." -ForegroundColor Yellow

# Backup old IDL
if (Test-Path $idlDest) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupPath = "client\src\idl\contract.json.backup_$timestamp"
    Copy-Item $idlDest $backupPath
    Write-Host "📦 Backed up old IDL to: $backupPath" -ForegroundColor Gray
}

# Copy new IDL
try {
    Copy-Item $idlSource $idlDest -Force
    Write-Host "✅ IDL updated successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Error copying IDL: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Show summary
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ IDL Update Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Deploy the contract: cd contract && anchor deploy" -ForegroundColor White
Write-Host "  2. Restart the client: cd client && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "The updated IDL is now at: $idlDest" -ForegroundColor Gray
Write-Host ""

