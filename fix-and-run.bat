@echo off
setlocal enabledelayedexpansion
echo ========================================
echo MikroTik Hotspot Platform - Fix & Run
echo ========================================
echo.

:: Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please download and install Node.js 18.x LTS from: https://nodejs.org/
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo Node.js version:
node --version
echo npm version:
npm --version
echo.

:: Step 1: Clean everything
echo Step 1: Cleaning previous installation...
if exist node_modules (
    echo Removing node_modules directory...
    rmdir /s /q node_modules 2>nul
    if exist node_modules (
        echo Warning: Could not remove node_modules completely
    ) else (
        echo Successfully removed node_modules
    )
)
if exist package-lock.json (
    echo Removing package-lock.json...
    del package-lock.json 2>nul
)
if exist yarn.lock (
    echo Removing yarn.lock...
    del yarn.lock 2>nul
)
echo Cleanup completed.
echo.

:: Step 2: Clear npm cache
echo Step 2: Clearing npm cache...
npm cache clean --force
if errorlevel 1 (
    echo Warning: npm cache clean failed, but continuing...
) else (
    echo npm cache cleared successfully
)
echo.

:: Step 3: Install dependencies with detailed error handling
echo Step 3: Installing dependencies...
echo This may take several minutes, please wait...
echo.
echo Trying: npm install --legacy-peer-deps
echo.

npm install --legacy-peer-deps
set npm_result=!errorlevel!

if !npm_result! neq 0 (
    echo.
    echo ========================================
    echo npm install failed with error code: !npm_result!
    echo ========================================
    echo.
    echo Trying alternative method with yarn...
    
    :: Check if yarn is available
    yarn --version >nul 2>&1
    if errorlevel 1 (
        echo Installing yarn globally...
        npm install -g yarn
        if errorlevel 1 (
            echo.
            echo ========================================
            echo INSTALLATION FAILED
            echo ========================================
            echo.
            echo Both npm and yarn installation failed.
            echo.
            echo Possible solutions:
            echo 1. Try running as Administrator
            echo 2. Check your internet connection
            echo 3. Try manual installation:
            echo    - Open PowerShell as Administrator
            echo    - Run: npm cache clean --force
            echo    - Run: npm install --legacy-peer-deps --verbose
            echo.
            echo Press any key to exit...
            pause >nul
            exit /b 1
        )
    )
    
    echo Installing with yarn...
    yarn install
    if errorlevel 1 (
        echo.
        echo ========================================
        echo INSTALLATION COMPLETELY FAILED
        echo ========================================
        echo.
        echo Both npm and yarn failed to install dependencies.
        echo.
        echo Manual steps to try:
        echo 1. Open PowerShell as Administrator
        echo 2. Navigate to this directory
        echo 3. Run: npm cache clean --force
        echo 4. Run: npm install --legacy-peer-deps --verbose
        echo 5. If that fails, try: npm install --force
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    ) else (
        echo yarn installation successful!
    )
) else (
    echo npm installation successful!
)

:: Step 4: Verify installation
echo.
echo Step 4: Verifying installation...
if not exist node_modules (
    echo ERROR: node_modules directory not found after installation
    echo Installation may have failed silently
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

:: Check for key dependencies
if not exist "node_modules\concurrently" (
    echo ERROR: concurrently not installed properly
    echo Try running: npm install concurrently --save-dev
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo Installation verification passed!

:: Step 5: Run setup
echo.
echo Step 5: Running setup script...
if exist setup.js (
    node setup.js
    if errorlevel 1 (
        echo Setup script encountered errors, but continuing...
    )
) else (
    echo Setup script not found, creating directories manually...
    if not exist data mkdir data
    if not exist logs mkdir logs
)

:: Step 6: Create necessary directories
echo.
echo Step 6: Creating necessary directories...
if not exist data mkdir data
if not exist logs mkdir logs
if not exist dist mkdir dist
echo Directories created successfully.

:: Step 7: Test the application
echo.
echo Step 7: Testing application startup...
echo.
echo ========================================
echo Starting MikroTik Hotspot Platform...
echo ========================================
echo.
echo The application is starting up...
echo This may take 30-60 seconds on first run.
echo.
echo Once started, you can access:
echo   Frontend: http://localhost:5173
echo   API: http://localhost:3001
echo.
echo Default login credentials:
echo   Username: admin
echo   Password: admin123
echo.
echo Press Ctrl+C to stop the application
echo ========================================
echo.

:: Start the development server
npm run dev

echo.
echo ========================================
echo Application has stopped
echo ========================================
echo.
echo If the application didn't start properly, try:
echo 1. npm run dev:api (to start only the backend)
echo 2. npm run dev:renderer (to start only the frontend)
echo.
echo Press any key to exit...
pause >nul