@echo off
REM BookDNA Setup Script for Windows
REM This script helps you set up the development environment

echo ==================================
echo BookDNA Setup Script
echo ==================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo X Python is not installed. Please install Python 3.8 or higher.
    exit /b 1
)

echo √ Python found
python --version

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo X Node.js is not installed. Please install Node.js 18 or higher.
    exit /b 1
)

echo √ Node.js found
node --version

REM Create Python virtual environment
echo.
echo Creating Python virtual environment...
python -m venv venv

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install Python dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

echo.
echo √ Python environment ready!
echo.

REM Install Node.js dependencies
echo Installing Node.js dependencies...
call npm install

echo.
echo √ Node.js dependencies installed!
echo.

REM Create necessary directories
echo Creating directories...
if not exist "data\processed" mkdir data\processed
if not exist "models" mkdir models

echo √ Directories created!
echo.

REM Check for environment files
if not exist ".env.local" (
    echo ! .env.local not found
    if exist ".env.local.example" (
        echo Creating .env.local from example...
        copy .env.local.example .env.local
        echo √ .env.local created. Please edit it with your Supabase credentials.
    ) else (
        echo Please create .env.local with your Supabase credentials.
    )
) else (
    echo √ .env.local exists
)

echo.
echo ==================================
echo Setup Complete!
echo ==================================
echo.
echo Next steps:
echo.
echo 1. Activate Python environment:
echo    venv\Scripts\activate.bat
echo.
echo 2. Process your data:
echo    python scripts/preprocess_data.py
echo    python scripts/generate_embeddings.py
echo    python scripts/build_faiss_index.py
echo.
echo 3. Set up Supabase:
echo    - Create project at supabase.com
echo    - Run migration SQL
echo    - Upload data with: python scripts/upload_to_supabase.py
echo.
echo 4. Configure environment:
echo    - Edit .env.local with your Supabase credentials
echo.
echo 5. Run the development server:
echo    npm run dev
echo.
echo For detailed instructions, see QUICKSTART.md
echo.
pause

