package com.anonymous.swiftshield;

import com.anonymous.swiftshield.SmsListenerService;

import android.content.Intent;
import android.os.Build;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class BackgroundMonitorModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public BackgroundMonitorModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "BackgroundMonitorModule";
    }

    @ReactMethod
    public void startSmsMonitoringService(Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, SmsListenerService.class);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent);
            } else {
                reactContext.startService(serviceIntent);
            }
            
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to start SMS monitoring service: " + e.getMessage());
        }
    }

    @ReactMethod
    public void stopSmsMonitoringService(Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, SmsListenerService.class);
            reactContext.stopService(serviceIntent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to stop SMS monitoring service: " + e.getMessage());
        }
    }

    public void sendEvent(String eventName, String data) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, data);
    }
} 