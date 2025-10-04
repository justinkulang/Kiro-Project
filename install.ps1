# MikroTik Hotspot Platform - PowerShell Installer
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MikroTik Hotspot Platform - PowerShell Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
    
    $npmVersion = npm --version
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please download and install Node.js 18.x LTS from: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Step 1: Clean everything
Write-Host "Step 1: Cleaning previous installation..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "Removing node_modules..." -ForegroundColor Gray
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}
if (Test-Path "package-lock.json") {
    Write-Host "Removing package-lock.json..." -ForegroundColor Gray
    Remove-Item "package-lock.json" -ErrorAction SilentlyContinue
}
if (Test-Path "yarn.lock") {
    Write-Host "Removing yarn.lock..." -ForegroundColor Gray
    Remove-Item "yarn.lock" -ErrorAction SilentlyContinue
}
Write-Host "Cleanup completed." -ForegroundColor Green
Write-Host ""

# Step 2: Clear npm cache
Write-Host "Step 2: Clearing npm cache..." -ForegroundColor Yellow
try {
    npm cache clean --force
    Write-Host "npm cache cleared successfully" -ForegroundColor Green
} catch {
    Write-Host "Warning: npm cache clean failed, but continuing..." -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Install dependencies
Write-Host "Step 3: Installing dependencies..." -ForegroundColor Yellow
Write-Host "This may take several minutes, please wait..." -ForegroundColor Gray
Write-Host ""

Write-Host "Running: npm install --legacy-peer-deps" -ForegroundColor Gray
$npmResult = Start-Process -FilePath "npm" -ArgumentList "install", "--legacy-peer-deps" -Wait -PassThru -NoNewWindow

if ($npmResult.ExitCode -ne 0) {
    Write-Host ""
    Write-Host "npm install failed with exit code: $($npmResult.ExitCode)" -ForegroundColor Red
    Write-Host "Trying with yarn..." -ForegroundColor Yellow
    
    # Try to install yarn
    try {
        yarn --version | Out-Null
    } catch {
        Write-Host "Installing yarn..." -ForegroundColor Gray
        npm install -g yarn
    }
    
    Write-Host "Running: yarn install" -ForegroundColor Gray
    $yarnResult = Start-Process -FilePath "yarn" -ArgumentList "install" -Wait -PassThru -NoNewWindow
    
    if ($yarnResult.ExitCode -ne 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "INSTALLATION FAILED" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Both npm and yarn failed to install dependencies." -ForegroundColor Red
        Write-Host ""
        Write-Host "Manual steps to try:" -ForegroundColor Yellow
        Write-Host "1. Run PowerShell as Administrator" -ForegroundColor White
        Write-Host "2. Navigate to this directory" -ForegroundColor White
        Write-Host "3. Run: npm cache clean --force" -ForegroundColor White
        Write-Host "4. Run: npm install --legacy-peer-deps --verbose" -ForegroundColor White
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    } else {
        Write-Host "yarn installation successful!" -ForegroundColor Green
    }
} else {
    Write-Host "npm installation successful!" -ForegroundColor Green
}

# Step 4: Verify installation
Write-Host ""
Write-Host "Step 4: Verifying installation..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "ERROR: node_modules directory not found after installation" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "node_modules\concurrently")) {
    Write-Host "ERROR: concurrently not installed properly" -ForegroundColor Red
    Write-Host "Try running: npm install concurrently --save-dev" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Installation verification passed!" -ForegroundColor Green

# Step 5: Create directories
Write-Host ""
Write-Host "Step 5: Creating necessary directories..." -ForegroundColor Yellow
if (-not (Test-Path "data")) { New-Item -ItemType Directory -Name "data" | Out-Null }
if (-not (Test-Path "logs")) { New-Item -ItemType Directory -Name "logs" | Out-Null }
if (-not (Test-Path "dist")) { New-Item -ItemType Directory -Name "dist" | Out-Null }
Write-Host "Directories created successfully." -ForegroundColor Green

# Step 6: Start the application
Write-Host ""
Write-Host "Step 6: Starting the application..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting MikroTik Hotspot Platform..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The application is starting up..." -ForegroundColor Gray
Write-Host "This may take 30-60 seconds on first run." -ForegroundColor Gray
Write-Host ""
Write-Host "Once started, you can access:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  API: http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "Default login credentials:" -ForegroundColor Yellow
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the application" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start the development server
npm run dev

Write-Host ""
Write-Host "Application has stopped." -ForegroundColor Yellow
Read-Host "Press Enter to exit"