# Application Icons

This directory contains the application icons for different platforms:

## Required Icons

### Windows
- `icon.ico` - Windows icon file (256x256, 128x128, 64x64, 48x48, 32x32, 16x16)

### macOS
- `icon.icns` - macOS icon file (1024x1024, 512x512, 256x256, 128x128, 64x64, 32x32, 16x16)

### Linux
- `icon.png` - PNG icon file (512x512 recommended)

## Icon Guidelines

- Use a simple, recognizable design
- Ensure good visibility at small sizes (16x16)
- Use consistent colors and branding
- Follow platform-specific design guidelines

## Creating Icons

You can use tools like:
- **Electron Icon Maker**: https://github.com/jaretburkett/electron-icon-maker
- **Icon Generator**: https://icon.kitchen/
- **Adobe Illustrator/Photoshop** for custom designs

## Current Icon

The current icon represents a WiFi/network symbol combined with MikroTik branding elements.

## Installation

Place the generated icon files in this directory:
```
assets/icons/
├── icon.ico     (Windows)
├── icon.icns    (macOS)
└── icon.png     (Linux)
```

The build process will automatically use these icons when packaging the application.