@echo off
echo Cleaning React Native project...

echo Cleaning Android build files...
cd android
call gradlew clean
cd ..

echo Clearing Metro cache...
if exist %TEMP%\metro-* (
    rmdir /s /q %TEMP%\metro-*
)

echo Cleaning and reinstalling node modules...
if exist node_modules (
    rmdir /s /q node_modules
)
if exist package-lock.json (
    del package-lock.json
)

echo Reinstalling dependencies...
call npm install

echo Clean completed. Run:
echo npx react-native start --reset-cache
echo npx react-native run-android