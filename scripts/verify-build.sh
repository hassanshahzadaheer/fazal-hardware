#!/bin/bash

# Build Verification Script
# Automates build check — ensures npm run build succeeds with zero errors
# Usage: ./scripts/verify-build.sh
# Exit Code: 0 (success) or 1 (failure)

set -e

echo "=========================================="
echo "Build Verification Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if Node.js is available
echo "📋 Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"
echo ""

# Step 2: Check if npm is available
echo "📋 Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ npm ${NPM_VERSION}${NC}"
echo ""

# Step 3: Check if package.json exists
echo "📋 Checking package.json..."
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ package.json not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ package.json exists${NC}"
echo ""

# Step 4: Install dependencies if node_modules missing
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install > /dev/null 2>&1
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ node_modules exists, skipping install${NC}"
fi
echo ""

# Step 5: Run the build
echo "🔨 Running build..."
echo "   Command: npm run build"
echo ""

if npm run build 2>&1; then
    BUILD_EXIT_CODE=$?
else
    BUILD_EXIT_CODE=$?
fi

echo ""
echo "=========================================="

# Step 6: Check for build output
if [ -d "dist" ] || [ -d "dist-electron" ]; then
    echo -e "${GREEN}✓ Build output created${NC}"
    if [ -d "dist" ]; then
        DIST_SIZE=$(du -sh dist | cut -f1)
        echo "  - dist/ size: ${DIST_SIZE}"
    fi
    if [ -d "dist-electron" ]; then
        DIST_ELECTRON_SIZE=$(du -sh dist-electron | cut -f1)
        echo "  - dist-electron/ size: ${DIST_ELECTRON_SIZE}"
    fi
else
    echo -e "${RED}✗ Build output not found (dist/ or dist-electron/)${NC}"
    exit 1
fi

# Step 7: Final status
echo "=========================================="
if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Build verification PASSED${NC}"
    echo ""
    echo "✅ Your build is ready for deployment!"
    exit 0
else
    echo -e "${RED}✗ Build verification FAILED${NC}"
    echo ""
    echo "❌ Fix the build errors above before proceeding"
    exit 1
fi
