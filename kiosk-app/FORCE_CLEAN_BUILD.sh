#!/bin/bash

# Force Clean Build Script for ISSOKiosk
# This script removes all cached build data to fix ThreeDS_SDK crash

echo "🧹 Cleaning ISSOKiosk build cache..."

# 1. Find and remove Derived Data
DERIVED_DATA_DIR="$HOME/Library/Developer/Xcode/DerivedData"
if [ -d "$DERIVED_DATA_DIR" ]; then
    echo "Removing Derived Data..."
    find "$DERIVED_DATA_DIR" -name "*ISSOKiosk*" -type d -exec rm -rf {} + 2>/dev/null
    echo "✅ Derived Data cleaned"
else
    echo "⚠️  Derived Data directory not found"
fi

# 2. Remove module cache
MODULE_CACHE="$HOME/Library/Developer/Xcode/DerivedData/ModuleCache.noindex"
if [ -d "$MODULE_CACHE" ]; then
    echo "Removing Module Cache..."
    rm -rf "$MODULE_CACHE"
    echo "✅ Module Cache cleaned"
fi

# 3. Remove build folder in project
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/ISSOKiosk" && pwd)"
if [ -d "$PROJECT_DIR/build" ]; then
    echo "Removing project build folder..."
    rm -rf "$PROJECT_DIR/build"
    echo "✅ Project build folder cleaned"
fi

echo ""
echo "✅ Clean complete!"
echo ""
echo "Next steps:"
echo "1. Delete the ISSOKiosk app from your iPad"
echo "2. Open Xcode"
echo "3. Product → Clean Build Folder (Shift+Cmd+K)"
echo "4. Rebuild and run (Cmd+R)"
echo ""

