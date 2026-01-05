# Fix Gradle Import - PowerShell Script
# This script helps resolve stuck Gradle import issues

Write-Host "=== Gradle Import Fix Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check for running Java processes
Write-Host "1. Checking for Java/Gradle processes..." -ForegroundColor Yellow
$javaProcesses = Get-Process -Name java -ErrorAction SilentlyContinue
if ($javaProcesses) {
    Write-Host "   Found $($javaProcesses.Count) Java process(es):" -ForegroundColor Yellow
    $javaProcesses | Select-Object Id, ProcessName, @{Name="CPU(s)";Expression={$_.CPU}}, @{Name="Memory(MB)";Expression={[math]::Round($_.WorkingSet/1MB,2)}} | Format-Table -AutoSize
    
    Write-Host "   NOTE: Some of these may be your IDE. Only kill Gradle daemon if needed." -ForegroundColor Gray
} else {
    Write-Host "   No Java processes found." -ForegroundColor Green
}

Write-Host ""

# Step 2: Stop Gradle daemon (if needed)
Write-Host "2. Stopping Gradle daemon..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\android" -ErrorAction SilentlyContinue
if (Test-Path ".\gradlew.bat") {
    & .\gradlew.bat --stop 2>&1 | Out-Null
    Write-Host "   Gradle daemon stopped." -ForegroundColor Green
} else {
    Write-Host "   gradlew.bat not found. Skipping..." -ForegroundColor Gray
}

Write-Host ""

# Step 3: Verify configuration
Write-Host "3. Verifying Gradle configuration..." -ForegroundColor Yellow
$wrapperProps = "$PSScriptRoot\android\gradle\wrapper\gradle-wrapper.properties"
$gradleProps = "$PSScriptRoot\android\gradle.properties"

if (Test-Path $wrapperProps) {
    $networkTimeout = Select-String -Path $wrapperProps -Pattern "networkTimeout=(\d+)" | ForEach-Object { $_.Matches.Groups[1].Value }
    if ($networkTimeout -ge 60000) {
        Write-Host "   ✓ Network timeout: ${networkTimeout}ms (OK)" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Network timeout: ${networkTimeout}ms (too low, should be >= 60000)" -ForegroundColor Red
    }
} else {
    Write-Host "   ✗ gradle-wrapper.properties not found" -ForegroundColor Red
}

if (Test-Path $gradleProps) {
    $memory = Select-String -Path $gradleProps -Pattern "org.gradle.jvmargs=-Xmx(\d+)m" | ForEach-Object { $_.Matches.Groups[1].Value }
    if ($memory -ge 2048) {
        Write-Host "   ✓ Memory allocation: ${memory}MB (OK)" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Memory allocation: ${memory}MB (too low, should be >= 2048)" -ForegroundColor Red
    }
} else {
    Write-Host "   ✗ gradle.properties not found" -ForegroundColor Red
}

Write-Host ""

# Step 4: Clean build (optional)
Write-Host "4. Next steps:" -ForegroundColor Cyan
Write-Host "   a) Cancel the import dialog in your IDE (click X)" -ForegroundColor White
Write-Host "   b) Wait 10-15 seconds for processes to stop" -ForegroundColor White
Write-Host "   c) In your IDE, go to: File > Invalidate Caches / Restart" -ForegroundColor White
Write-Host "   d) After restart, re-import the project" -ForegroundColor White
Write-Host ""
Write-Host "   OR run a command-line build first:" -ForegroundColor White
Write-Host "   cd android" -ForegroundColor Gray
Write-Host "   .\gradlew.bat tasks" -ForegroundColor Gray
Write-Host ""

Set-Location -Path $PSScriptRoot

