#!/bin/bash

# PWA Icon Generator Script
# This script generates all required PWA icon sizes from a source image

echo "🎨 PWA Icon Generator"
echo "===================="
echo ""

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed."
    echo "📦 Installing ImageMagick..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y imagemagick
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install imagemagick
    else
        echo "Please install ImageMagick manually:"
        echo "  - Ubuntu/Debian: sudo apt-get install imagemagick"
        echo "  - macOS: brew install imagemagick"
        exit 1
    fi
fi

# Check if source image exists
if [ ! -f "source-icon.png" ]; then
    echo "❌ source-icon.png not found in current directory"
    echo ""
    echo "📝 Instructions:"
    echo "1. Create a 512x512px PNG image named 'source-icon.png'"
    echo "2. Place it in the project root directory"
    echo "3. Run this script again"
    echo ""
    echo "💡 Tip: Your source image should be:"
    echo "   - Square (1:1 aspect ratio)"
    echo "   - At least 512x512 pixels"
    echo "   - PNG format with transparency"
    exit 1
fi

# Create icons directory
mkdir -p public/icons

# Generate all icon sizes
sizes=(72 96 128 144 152 192 384 512)

echo "🔨 Generating icons..."
echo ""

for size in "${sizes[@]}"; do
    output="public/icons/icon-${size}x${size}.png"
    convert source-icon.png -resize ${size}x${size} "$output"
    echo "✅ Generated: $output"
done

# Generate favicon
convert source-icon.png -resize 32x32 public/favicon.ico
echo "✅ Generated: public/favicon.ico"

# Generate apple-touch-icon
convert source-icon.png -resize 180x180 public/apple-touch-icon.png
echo "✅ Generated: public/apple-touch-icon.png"

echo ""
echo "✨ All icons generated successfully!"
echo ""
echo "📱 Next steps:"
echo "1. Build your app: npm run build"
echo "2. Test on mobile device"
echo "3. Look for 'Add to Home Screen' prompt"
