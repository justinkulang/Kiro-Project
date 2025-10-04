@echo off
echo ========================================
echo MikroTik Hotspot Platform Installer
echo ========================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please download and install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

:: Clean previous installation
echo Cleaning previous installation...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
echo.

:: Clear npm cache
echo Clearing npm cache...
npm cache clean --force
echo.

:: Install dependencies
echo Installing dependencies...
npm install --legacy-peer-deps
if errorlevel 1 (
    echo.
    echo Installation failed with npm. Trying with yarn...
    
    :: Try to install yarn
    npm install -g yarn
    if errorlevel 1 (
        echo ERROR: Failed to install yarn
        echo Please try manual installation:
        echo 1. npm cache clean --force
        echo 2. npm install --legacy-peer-deps
        pause
        exit /b 1
    )
    
    :: Install with yarn
    yarn install
    if errorlevel 1 (
        echo ERROR: Installation failed with both npm and yarn
        echo Please check the error messages above
        pause
        exit /b 1
    )
)

:: Run setup
echo.
echo Running setup...
npm run setup

echo.
echo ========================================
echo Installation completed successfully!
echo ========================================
echo.
echo To start the application:
echo   npm run dev
echo.
echo The application will be available at:
echo   Frontend: http://localhost:5173
echo   API: http://localhost:3001
echo.
echo Default login credentials:
echo   Username: admin
echo   Password: admin123
echo.
pause