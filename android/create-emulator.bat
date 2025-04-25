@echo off
echo Creating a more compatible emulator...

:: Kill any running emulators
adb devices | findstr emulator && adb -s emulator-5554 emu kill

:: List available system images
echo Available system images (you might need to install one):
D:\AndroidSDK\tools\bin\sdkmanager --list | findstr "system-images;android-33" 

:: Create new AVD with x86 (not x86_64) for better compatibility
echo Creating new emulator with x86 architecture...
D:\AndroidSDK\tools\bin\avdmanager create avd -n Pixel_6_Compat -k "system-images;android-33;google_apis;x86" -d "pixel_6"

:: Start the emulator with compatibility options
echo Starting new emulator with compatibility options...
D:\AndroidSDK\emulator\emulator -avd Pixel_6_Compat -no-snapshot -gpu swiftshader_indirect -no-accel