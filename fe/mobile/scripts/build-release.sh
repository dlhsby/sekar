#!/bin/bash
#
# SEKAR Mobile - Release Build Script
# Builds production-ready APK and AAB files
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SEKAR Mobile - Release Build${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if we're in the mobile directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must be run from fe/mobile directory${NC}"
    exit 1
fi

# Check if Android directory exists
if [ ! -d "android" ]; then
    echo -e "${RED}❌ Error: android directory not found${NC}"
    exit 1
fi

# Check for gradle.properties with signing config
echo -e "${YELLOW}📋 Checking signing configuration...${NC}"
if ! grep -q "SEKAR_RELEASE_STORE_FILE" android/gradle.properties 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Warning: Release signing not configured in gradle.properties${NC}"
    echo -e "${YELLOW}   Build will use debug signing for testing purposes only.${NC}"
    echo -e "${YELLOW}   See android/gradle.properties.example for setup instructions.${NC}"
    echo ""
    read -p "Continue with debug signing? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Build cancelled${NC}"
        exit 1
    fi
fi

# Check for .env file
echo -e "${YELLOW}📋 Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found${NC}"
    echo -e "${YELLOW}   Copy .env.example to .env and configure for production${NC}"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Build cancelled${NC}"
        exit 1
    fi
else
    # Check if using production API URL
    if grep -q "http://10.0.2.2" .env || grep -q "localhost" .env; then
        echo -e "${YELLOW}⚠️  Warning: .env appears to use development API URL${NC}"
        echo -e "${YELLOW}   Make sure to set production URL before release${NC}"
        echo ""
    fi
fi

# Navigate to android directory
cd android

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
./gradlew clean

# Build APK
echo ""
echo -e "${GREEN}📦 Building Release APK...${NC}"
./gradlew assembleRelease

# Build AAB (Android App Bundle for Google Play)
echo ""
echo -e "${GREEN}📦 Building Release AAB (Android App Bundle)...${NC}"
./gradlew bundleRelease

# Check if builds succeeded
APK_PATH="app/build/outputs/apk/release/app-release.apk"
AAB_PATH="app/build/outputs/bundle/release/app-release.aab"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Build Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo -e "${GREEN}📦 APK Location:${NC}"
    echo -e "   $(pwd)/$APK_PATH"
    echo -e "   Size: $APK_SIZE"
    echo ""
fi

if [ -f "$AAB_PATH" ]; then
    AAB_SIZE=$(du -h "$AAB_PATH" | cut -f1)
    echo -e "${GREEN}📦 AAB Location:${NC}"
    echo -e "   $(pwd)/$AAB_PATH"
    echo -e "   Size: $AAB_SIZE"
    echo ""
fi

echo -e "${YELLOW}📋 Next Steps:${NC}"
echo -e "   1. Test the APK on a real device"
echo -e "   2. Verify all features work correctly"
echo -e "   3. Check app size and performance"
echo -e "   4. For Google Play: Upload the AAB file"
echo -e "   5. For direct distribution: Use the APK file"
echo ""

# Return to mobile directory
cd ..

echo -e "${GREEN}✨ Done!${NC}"
echo ""
