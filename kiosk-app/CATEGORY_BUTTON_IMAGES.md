# Category Button Background Images

## Image Requirements

### Asset Names
- **Selected State**: `CategoryButtonSelected`
- **Unselected State**: `CategoryButtonUnselected`

### Button Dimensions
- **Height**: 70 points (fixed)
- **Width**: Up to 400 points (default, configurable via theme)
- **Corner Radius**: 12 points

### Recommended Image Sizes

For best quality on all devices, provide images at multiple resolutions:

#### @1x (Standard Resolution)
- **Width**: 400 pixels
- **Height**: 70 pixels
- **Aspect Ratio**: ~5.7:1 (wide rectangle)

#### @2x (Retina Display)
- **Width**: 800 pixels
- **Height**: 140 pixels

#### @3x (Super Retina Display)
- **Width**: 1200 pixels
- **Height**: 210 pixels

### Image Format
- **Format**: PNG (recommended) or JPEG
- **Color Space**: sRGB
- **Transparency**: Optional (PNG supports alpha channel)

### Design Tips
1. **Safe Area**: Keep important content within the center area, as edges may be slightly cropped
2. **Aspect Ratio**: Images will be scaled to fill, so any aspect ratio works, but 5.7:1 matches the button shape
3. **Text Overlay**: Remember that white text will be overlaid on your images, so ensure good contrast
4. **Corner Radius**: The button has 12pt corner radius, so design accordingly

### How to Add Images
1. Open `Assets.xcassets` in Xcode
2. Create new Image Set named `CategoryButtonSelected`
3. Create new Image Set named `CategoryButtonUnselected`
4. Add your images at @1x, @2x, and @3x resolutions
5. The app will automatically use these images when available

### Fallback Behavior
- If images are not found, the app will use the configured color backgrounds
- Colors are set via theme configuration in the admin portal

