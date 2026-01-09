# Responsive Layout System

## Overview

The kiosk app now uses a universal responsive layout system that ensures consistent appearance across different screen sizes (different iPad/tablet sizes). All layouts are designed for a base reference screen and automatically scale proportionally to any device size.

## Base Reference Screen

- **Device**: iPad Pro 12.9" (Portrait)
- **Width**: 1024 points
- **Height**: 1366 points

All absolute coordinates and dimensions are designed for this reference size and automatically scale based on the current device's screen dimensions.

## How It Works

### ResponsiveLayoutHelper

A helper class (`ResponsiveLayoutHelper.swift`) provides:

1. **Scale Factor Calculation**: Calculates the proportional scale factor based on current screen size vs. base reference
2. **Coordinate Scaling**: Scales X/Y coordinates from base reference to current screen size
3. **Dimension Scaling**: Scales font sizes, padding, spacing, and other dimensions proportionally

### GeometryProxy Extension

The `GeometryProxy` extension adds convenient methods:
- `geometry.scale(value)` - Scale any dimension value proportionally
- `geometry.scaleX(x)` - Scale X coordinate from base reference
- `geometry.scaleY(y)` - Scale Y coordinate from base reference
- `geometry.scaleFactor` - Get the current scale factor
- `geometry.widthScale` / `geometry.heightScale` - Get width/height-specific scale factors

## Implementation Status

### ✅ Completed

1. **ResponsiveLayoutHelper Created**: Core helper class with scaling functions
2. **GeometryProxy Extension**: Convenient methods for responsive scaling
3. **Position Scaling**: All `.position(x:y:)` calls in `KioskHomeView` now use responsive scaling

### 🔄 In Progress

1. **Font Size Scaling**: Font sizes in `positionedElements` should use `geometry.scale()` for all font sizes
2. **Padding Scaling**: Padding values should use `geometry.scale()` for consistent spacing

### 📋 Remaining

1. **DonationHomeView**: Update donation selection screen to use responsive layout
2. **Default Layout**: Update default VStack layout to also scale fonts/padding
3. **Testing**: Test on different iPad sizes to verify scaling works correctly

## Usage Examples

### Scaling Positions

```swift
// Before (absolute positioning - doesn't scale)
.position(x: CGFloat(x), y: CGFloat(y))

// After (responsive positioning - scales proportionally)
.position(x: geometry.scaleX(CGFloat(x)), y: geometry.scaleY(CGFloat(y)))
```

### Scaling Font Sizes

```swift
// Before (fixed size)
.font(.system(size: 42, weight: .bold))

// After (responsive size)
.font(.system(size: geometry.scale(42), weight: .bold))
```

### Scaling Padding

```swift
// Before (fixed padding)
.padding(.horizontal, 20)
.padding(.top, 60)

// After (responsive padding)
.padding(.horizontal, geometry.scale(20))
.padding(.top, geometry.scale(60))
```

## Benefits

1. **Universal Design**: Layouts look identical on all device sizes
2. **Proportional Scaling**: Everything scales proportionally, maintaining visual ratios
3. **No Device-Specific Code**: Same code works on all iPad/tablet sizes
4. **Future-Proof**: Automatically works with new device sizes

## Reference Screen Sizes

- **iPad Pro 12.9"** (Portrait): 1024 × 1366 (Base Reference)
- **iPad Pro 11"** (Portrait): 834 × 1194
- **iPad Air** (Portrait): 820 × 1180
- **iPad Mini** (Portrait): 744 × 1133

All devices will scale proportionally from the base reference size (1024 × 1366).

## Notes

- The system uses the **minimum** of width/height scale factors to ensure content fits on screen
- Scaling is automatic and transparent - existing X/Y coordinates work without modification
- Font sizes, padding, and spacing should also be scaled for complete responsiveness

