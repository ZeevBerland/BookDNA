#!/bin/bash

# BookDNA Setup Script
# This script helps you set up the development environment

echo "=================================="
echo "BookDNA Setup Script"
echo "=================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo "✓ Python 3 found: $(python3 --version)"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

echo "✓ Node.js found: $(node --version)"

# Create Python virtual environment
echo ""
echo "Creating Python virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo ""
echo "✓ Python environment ready!"
echo ""

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

echo ""
echo "✓ Node.js dependencies installed!"
echo ""

# Create necessary directories
echo "Creating directories..."
mkdir -p data/processed
mkdir -p models

echo "✓ Directories created!"
echo ""

# Check for environment files
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found"
    if [ -f ".env.local.example" ]; then
        echo "Creating .env.local from example..."
        cp .env.local.example .env.local
        echo "✓ .env.local created. Please edit it with your Supabase credentials."
    else
        echo "Please create .env.local with your Supabase credentials."
    fi
else
    echo "✓ .env.local exists"
fi

echo ""
echo "=================================="
echo "Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Activate Python environment:"
echo "   source venv/bin/activate"
echo ""
echo "2. Process your data:"
echo "   python scripts/preprocess_data.py"
echo "   python scripts/generate_embeddings.py"
echo "   python scripts/build_faiss_index.py"
echo ""
echo "3. Set up Supabase:"
echo "   - Create project at supabase.com"
echo "   - Run migration SQL"
echo "   - Upload data with: python scripts/upload_to_supabase.py"
echo ""
echo "4. Configure environment:"
echo "   - Edit .env.local with your Supabase credentials"
echo ""
echo "5. Run the development server:"
echo "   npm run dev"
echo ""
echo "For detailed instructions, see QUICKSTART.md"
echo ""

