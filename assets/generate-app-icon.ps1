Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 256,256
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::Transparent)

$dark = [System.Drawing.Color]::FromArgb(30, 27, 24)
$white = [System.Drawing.Color]::White
$pink = [System.Drawing.Color]::FromArgb(255, 182, 193)
$black = [System.Drawing.Color]::Black

$brushDark = New-Object System.Drawing.SolidBrush($dark)
$brushWhite = New-Object System.Drawing.SolidBrush($white)
$brushPink = New-Object System.Drawing.SolidBrush($pink)
$brushBlack = New-Object System.Drawing.SolidBrush($black)

# Scaled coordinates by factor of 8 for a crisp 256x256 icon
# Left Ear
$g.FillRectangle($brushDark, 56, 32, 24, 32)
$g.FillRectangle($brushPink, 64, 40, 8, 16)

# Right Ear
$g.FillRectangle($brushDark, 176, 32, 24, 32)
$g.FillRectangle($brushPink, 184, 40, 8, 16)

# Head/Body Center
$g.FillRectangle($brushDark, 56, 64, 144, 112)
$g.FillRectangle($brushDark, 32, 104, 192, 40)

# Tail
$g.FillRectangle($brushDark, 208, 80, 24, 64)
$g.FillRectangle($brushDark, 224, 56, 16, 32)

# White Paws
$g.FillRectangle($brushWhite, 72, 176, 24, 24)
$g.FillRectangle($brushWhite, 160, 176, 24, 24)
$g.FillRectangle($brushDark, 72, 168, 24, 8)
$g.FillRectangle($brushDark, 160, 168, 24, 8)

# White Eyes
$g.FillRectangle($brushWhite, 72, 88, 32, 32)
$g.FillRectangle($brushWhite, 152, 88, 32, 32)

# Black Pupils
$g.FillRectangle($brushBlack, 72, 88, 16, 16)
$g.FillRectangle($brushBlack, 168, 104, 16, 16)

$bmp.Save("d:\desktop-pets-Kura\assets\app-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
write-host "App icon generated successfully at d:\desktop-pets-Kura\assets\app-icon.png!"
