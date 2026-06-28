Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 32,32
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::Transparent)

$coral = [System.Drawing.Color]::FromArgb(217, 119, 87)
$brush = New-Object System.Drawing.SolidBrush($coral)
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$blackBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)

# Draw white sticker outline
$g.FillRectangle($whiteBrush, 3, 5, 26, 21)
$g.FillRectangle($whiteBrush, 0, 10, 32, 8)
$g.FillRectangle($whiteBrush, 5, 22, 4, 6)
$g.FillRectangle($whiteBrush, 10, 22, 4, 6)
$g.FillRectangle($whiteBrush, 18, 22, 4, 6)
$g.FillRectangle($whiteBrush, 23, 22, 4, 6)

# Draw coral body
$g.FillRectangle($brush, 5, 7, 22, 17)
$g.FillRectangle($brush, 2, 12, 28, 4)
$g.FillRectangle($brush, 7, 20, 2, 6)
$g.FillRectangle($brush, 12, 20, 2, 6)
$g.FillRectangle($brush, 18, 20, 2, 6)
$g.FillRectangle($brush, 23, 20, 2, 6)

# Draw black eyes
$g.FillRectangle($blackBrush, 9, 11, 2, 4)
$g.FillRectangle($blackBrush, 21, 11, 2, 4)

$bmp.Save("d:\desktop-pets-Kura\assets\tray-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
write-host "Tray icon generated successfully!"
