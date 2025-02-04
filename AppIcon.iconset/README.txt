This directory contains the Mac icon set for this app. The following commands should compile all of them into a single file:

macOS:
iconutil -c icns AppIcon.iconset -o icon.icns

Windows (ImageMagick needed):
magick -background transparent icon_512x512.png -define icon:auto-resize=16,24,32,48,64,72,96,128,256 icon.ico

The file should be placed into the root directory. This icon set was generated using AppIcon Generator (http://www.tweaknow.com/appicongenerator.php).
