Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 32,32
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

# Left Ear
$g.FillRectangle($brushDark, 7, 4, 3, 4)
$g.FillRectangle($brushPink, 8, 5, 1, 2)

# Right Ear
$g.FillRectangle($brushDark, 22, 4, 3, 4)
$g.FillRectangle($brushPink, 23, 5, 1, 2)

# Head/Body Center
$g.FillRectangle($brushDark, 7, 8, 18, 14)
$g.FillRectangle($brushDark, 4, 13, 24, 5)

# Tail
$g.FillRectangle($brushDark, 26, 10, 3, 8)
$g.FillRectangle($brushDark, 28, 7, 2, 4)

# White Paws
$g.FillRectangle($brushWhite, 9, 22, 3, 3)
$g.FillRectangle($brushWhite, 20, 22, 3, 3)
$g.FillRectangle($brushDark, 9, 21, 3, 1)
$g.FillRectangle($brushDark, 20, 21, 3, 1)

# White Eyes
$g.FillRectangle($brushWhite, 9, 11, 4, 4)
$g.FillRectangle($brushWhite, 19, 11, 4, 4)

# Black Pupils
$g.FillRectangle($brushBlack, 9, 11, 2, 2)
$g.FillRectangle($brushBlack, 21, 13, 2, 2)

$bmp.Save("d:\desktop-pets-Kura\assets\tray-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
write-host "BlackYang Tray icon generated successfully!"
