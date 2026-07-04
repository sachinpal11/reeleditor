Add-Type -AssemblyName System.Drawing

# Create directories
New-Item -ItemType Directory -Force -Path "public/assets"
New-Item -ItemType Directory -Force -Path "public/uploads"
New-Item -ItemType Directory -Force -Path "config"
New-Item -ItemType Directory -Force -Path "renders"

# Copy background image
Copy-Item "C:\Users\Sachin\.gemini\antigravity-ide\brain\cf155a60-9dbc-44bd-9285-4cc5e9c25a9c\premium_reel_bg_1783157719381.png" "public/assets/background.png" -Force

# Generate header.png (1080x1920, transparent background, text at top)
$header = New-Object System.Drawing.Bitmap 1080, 1920
$g = [System.Drawing.Graphics]::FromImage($header)
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Draw a sleek logo icon (a rounded square with a play triangle)
$logoBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 99, 102, 241)) # Indigo
$g.FillEllipse($logoBrush, 80, 80, 60, 60)

# Draw white play triangle inside logo
$playPoints = @(
    (New-Object System.Drawing.Point 102, 95),
    (New-Object System.Drawing.Point 122, 110),
    (New-Object System.Drawing.Point 102, 125)
)
$whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$g.FillPolygon($whiteBrush, $playPoints)

# Draw Title "ReelEditor"
$titleFont = [System.Drawing.Font]::new("Segoe UI", [float]28, [System.Drawing.FontStyle]::Bold)
$g.DrawString("ReelEditor", $titleFont, $whiteBrush, 160, 80)

# Draw Username "Sachin" and handle "@reeleditor"
$userFont = [System.Drawing.Font]::new("Segoe UI", [float]16, [System.Drawing.FontStyle]::Regular)
$grayBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 156, 163, 175)) # Gray 400
$g.DrawString("Sachin", $userFont, $grayBrush, 160, 130)

$handleFont = [System.Drawing.Font]::new("Segoe UI", [float]16, [System.Drawing.FontStyle]::Bold)
$indigoBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 129, 140, 248)) # Indigo 400
$g.DrawString("@reeleditor", $handleFont, $indigoBrush, 240, 130)

# Save header
$header.Save("public/assets/header.png", [System.Drawing.Imaging.ImageFormat]::Png)
$header.Dispose()

# Generate watermark.png (200x200, transparent, white logo)
$wm = New-Object System.Drawing.Bitmap 200, 200
$g2 = [System.Drawing.Graphics]::FromImage($wm)
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Draw a white outline circle
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 6
$g2.DrawEllipse($pen, 20, 20, 160, 160)

# Draw a white play button inside the circle
$wmPoints = @(
    (New-Object System.Drawing.Point 85, 65),
    (New-Object System.Drawing.Point 135, 100),
    (New-Object System.Drawing.Point 85, 135)
)
$g2.FillPolygon($whiteBrush, $wmPoints)

# Save watermark
$wm.Save("public/assets/watermark.png", [System.Drawing.Imaging.ImageFormat]::Png)
$wm.Dispose()
