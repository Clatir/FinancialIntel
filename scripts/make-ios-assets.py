#!/usr/bin/env python3
"""The phone's icon and launch screen (T307) from resources/icon.png: the tile full-bleed on 1024x1024 without alpha
(iOS rounds the corners itself), the launch screen dark with the icon in the middle (no Capacitor logo)."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BG = (0x0B, 0x0D, 0x10)
icon = Image.open(ROOT / 'resources/icon.png').convert('RGBA')
# The inside of the computers' tile (its border and margin off – iOS draws the rounded edge): the phone's icon.
tile = icon.crop((24, 24, 488, 488)).resize((1024, 1024), Image.LANCZOS)
out = Image.new('RGB', (1024, 1024), BG)
out.paste(tile, (0, 0), tile)
assets = ROOT / 'ios/App/App/Assets.xcassets'
out.save(assets / 'AppIcon.appiconset/AppIcon-512@2x.png', optimize=True)
splash = Image.new('RGB', (2732, 2732), BG)
small = icon.resize((360, 360), Image.LANCZOS)
splash.paste(small, ((2732 - 360) // 2, (2732 - 360) // 2), small)
for name in ('splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'):
    splash.save(assets / 'Splash.imageset' / name, optimize=True)
print('ok')
