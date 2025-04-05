@echo off
echo Checking for crash logs...

echo 1. App package crash logs:
adb logcat -d *:E | findstr "com.anonymous.swiftshield"

echo 2. React Native crash logs:
adb logcat -d *:E | findstr "ReactNative"

echo 3. JavaScript crash logs:
adb logcat -d *:E | findstr "JS"

echo 4. Fatal logs:
adb logcat -d *:F

echo 5. Java exceptions:
adb logcat -d *:E | findstr "Exception"

echo 6. Metro bundler errors:
adb logcat -d *:E | findstr "Metro"

echo Complete log check. Use 'adb logcat *:E' for full error logs.