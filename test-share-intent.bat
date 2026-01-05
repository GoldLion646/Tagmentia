@echo off
REM Test Share Intent Script for Tagmentia App (Windows)
REM This script sends share intents to the Android app using ADB

set PACKAGE_NAME=app.lovable.tagmentia
set ACTIVITY_NAME=app.lovable.tagmentia.MainActivity

echo Testing Share Intent for Tagmentia App
echo ========================================
echo.

REM Test 1: YouTube URL
echo Test 1: Sharing YouTube URL...
adb shell am start -a android.intent.action.SEND -t "text/plain" --es android.intent.extra.TEXT "https://www.youtube.com/watch?v=dQw4w9WgXcQ" -n %PACKAGE_NAME%/%ACTIVITY_NAME%

timeout /t 3 /nobreak >nul

REM Test 2: YouTube Short URL
echo.
echo Test 2: Sharing YouTube Short URL (youtu.be)...
adb shell am start -a android.intent.action.SEND -t "text/plain" --es android.intent.extra.TEXT "https://youtu.be/dQw4w9WgXcQ" -n %PACKAGE_NAME%/%ACTIVITY_NAME%

timeout /t 3 /nobreak >nul

REM Test 3: YouTube URL with text
echo.
echo Test 3: Sharing YouTube URL with descriptive text...
adb shell am start -a android.intent.action.SEND -t "text/plain" --es android.intent.extra.TEXT "Check out this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ" -n %PACKAGE_NAME%/%ACTIVITY_NAME%

timeout /t 3 /nobreak >nul

REM Test 4: TikTok URL
echo.
echo Test 4: Sharing TikTok URL...
adb shell am start -a android.intent.action.SEND -t "text/plain" --es android.intent.extra.TEXT "https://www.tiktok.com/@user/video/1234567890" -n %PACKAGE_NAME%/%ACTIVITY_NAME%

timeout /t 3 /nobreak >nul

REM Test 5: Instagram URL
echo.
echo Test 5: Sharing Instagram URL...
adb shell am start -a android.intent.action.SEND -t "text/plain" --es android.intent.extra.TEXT "https://www.instagram.com/p/ABC123/" -n %PACKAGE_NAME%/%ACTIVITY_NAME%

echo.
echo ========================================
echo All tests completed!
echo.
echo Note: Make sure your device is connected and ADB is working.
echo Check the app logs with: adb logcat ^| findstr MainActivity
pause

