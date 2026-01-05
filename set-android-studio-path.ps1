# Script to set CAPACITOR_ANDROID_STUDIO_PATH environment variable
# Run this script after installing Android Studio

Write-Host "Setting CAPACITOR_ANDROID_STUDIO_PATH environment variable..." -ForegroundColor Cyan

# Common Android Studio installation paths
$possiblePaths = @(
    "C:\Program Files\Android\Android Studio\bin\studio64.exe",
    "C:\Program Files (x86)\Android\Android Studio\bin\studio64.exe",
    "$env:LOCALAPPDATA\Programs\Android Studio\bin\studio64.exe",
    "$env:ProgramFiles\Android\Android Studio\bin\studio64.exe"
)

$studioPath = $null

# Try to find Android Studio
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $studioPath = $path
        Write-Host "Found Android Studio at: $path" -ForegroundColor Green
        break
    }
}

# If not found, prompt user
if (-not $studioPath) {
    Write-Host "Android Studio not found in common locations." -ForegroundColor Yellow
    Write-Host "Please enter the full path to studio64.exe:" -ForegroundColor Yellow
    $studioPath = Read-Host "Path"
    
    if (-not (Test-Path $studioPath)) {
        Write-Host "Error: Path does not exist: $studioPath" -ForegroundColor Red
        exit 1
    }
}

# Set environment variable for current session
$env:CAPACITOR_ANDROID_STUDIO_PATH = $studioPath
Write-Host "Set for current session: $studioPath" -ForegroundColor Green

# Set environment variable permanently
try {
    [System.Environment]::SetEnvironmentVariable("CAPACITOR_ANDROID_STUDIO_PATH", $studioPath, "User")
    Write-Host "Set permanently for user: $studioPath" -ForegroundColor Green
    Write-Host "`nNote: You may need to restart your terminal for the change to take effect." -ForegroundColor Yellow
} catch {
    Write-Host "Error setting permanent environment variable: $_" -ForegroundColor Red
    Write-Host "You can set it manually in System Properties > Environment Variables" -ForegroundColor Yellow
}

