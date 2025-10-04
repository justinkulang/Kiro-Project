@echo off
echo ========================================
echo Manual Installation - Step by Step
echo ========================================
echo.
echo This script will install the application step by step.
echo Press any key after each step to continue, or Ctrl+C to stop.
echo.

:: Step 1
echo Step 1: Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js 18.x LTS first.
    pause
    exit /b 1
)
echo Node.js found. Press any key to continue...
pause >nul

:: Step 2
echo.
echo Step 2: Cleaning old installation...
if exist node_modules (
    echo Removing node_modules...
    rmdir /s /q node_modules
)
if exist package-lock.json del package-lock.json
echo Cleanup done. Press any key to continue...
pause >nul

:: Step 3
echo.
echo Step 3: Clearing npm cache...
npm cache clean --force
echo Cache cleared. Press any key to continue...
pause >nul

:: Step 4
echo.
echo Step 4: Installing dependencies...
echo Running: npm install --legacy-peer-deps
echo This will take several minutes...
npm install --legacy-peer-deps
if errorlevel 1 (
    echo.
    echo npm install failed. Let's try with more verbose output:
    echo Running: npm install --legacy-peer-deps --verbose
    npm install --legacy-peer-deps --verbose
    if errorlevel 1 (
        echo.
        echo npm still failed. Trying yarn...
        npm install -g yarn
        yarn install
        if errorlevel 1 (
            echo.
            echo Both npm and yarn failed. Please check the error messages above.
            pause
            exit /b 1
        )
    )
)
echo Dependencies installed successfully! Press any key to continue...
pause >nul

:: Step 5
echo.
echo Step 5: Creating directories...
if not exist data mkdir data
if not exist logs mkdir logs
echo Directories created. Press any key to continue...
pause >nul

:: Step 6
echo.
echo Step 6: Testing the application...
echo The application will now start. This may take 30-60 seconds.
echo.
echo Once running, open your browser to:
echo   http://localhost:5173
echo.
echo Login with: admin / admin123
echo.
echo Press Ctrl+C in this window to stop the application.
echo Press any key to start...
pause >nul

npm run dev

echo.
echo Application stopped. Press any key to exit...
pause >nul