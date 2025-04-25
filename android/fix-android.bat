@echo off
echo Fixing Android project configuration...

:: Create backup of current build.gradle
echo Creating backup of current build.gradle...
cd android\app
copy build.gradle build.gradle.bak

:: Replace the build.gradle with the fixed version
echo Applying fixed build.gradle...
copy build.gradle.fixed build.gradle

:: Clean the Android project
echo Cleaning Android project...
cd ..
call gradlew clean

echo Android project fixed. Now run:
echo npx react-native start --reset-cache
echo npx react-native run-android

cd ..