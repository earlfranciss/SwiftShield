package com.anonymous.swiftshield;

// --- Android Imports ---
import android.content.Intent;
import android.os.Build;
import android.util.Log; // Import Log

// --- React Native Imports ---
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule; // Corrected spelling
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments; // Import Arguments (needed for createMap and manual map copying)
import com.facebook.react.bridge.ReadableMap; // Import ReadableMap (needed for triggerThreatDetectedEvent)
import com.facebook.react.bridge.ReadableMapKeySetIterator; // For manual map copying
import com.facebook.react.bridge.ReadableType; // For manual map copying


// --- Service Imports ---
import com.anonymous.swiftshield.SmsListenerServices; // Assuming this is the correct name of your SMS Service
import com.anonymous.swiftshield.GmailMonitoringService; // Import GmailMonitoringService


public class BackgroundMonitorModule extends ReactContextBaseJavaModule {
    private static final String TAG = "BackgroundMonitorModule"; // Use TAG for logging
    private final ReactApplicationContext reactContext;
    // Static reference to the ReactContext to emit events from background services
    // This MUST be set when the module is initialized on the UI thread
    private static ReactApplicationContext staticReactContext;

    public BackgroundMonitorModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        staticReactContext = reactContext; // Store the context statically
        Log.d(TAG, "BackgroundMonitorModule initialized.");
    }

    @Override
    public String getName() {
        return "BackgroundMonitorModule";
    }

    /**
     * Starts the native SMS monitoring Foreground Service.
     * Called from React Native (e.g., BackgroundTaskHandler.startMonitoring).
     */
    @ReactMethod
    public void startSmsMonitoringService(Promise promise) {
        Log.d(TAG, "startSmsMonitoringService ReactMethod called.");
        try {
            // Ensure this is correct class name (SmsListenerServices vs SmsListenerService)
            Intent serviceIntent = new Intent(reactContext, SmsListenerServices.class);

            // Start as a Foreground Service
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent);
            } else {
                reactContext.startService(serviceIntent);
            }

            promise.resolve(true); // Indicate start request was sent
        } catch (Exception e) {
            Log.e(TAG, "Failed to start SMS monitoring service: " + e.getMessage(), e); // Use Log
            promise.reject("ERROR_SMS_START", "Failed to start SMS monitoring service: " + e.getMessage());
        }
    }

    /**
     * Stops the native SMS monitoring Foreground Service.
     * Called from React Native (e.g., BackgroundTaskHandler.stopMonitoring).
     */
    @ReactMethod
    public void stopSmsMonitoringService(Promise promise) {
         Log.d(TAG, "stopSmsMonitoringService ReactMethod called.");
        try {
            // Ensure correct class name
            Intent serviceIntent = new Intent(reactContext, SmsListenerServices.class);
            reactContext.stopService(serviceIntent);
            promise.resolve(true); // Indicate stop request was sent
        } catch (Exception e) {
             Log.e(TAG, "Failed to stop SMS monitoring service: " + e.getMessage(), e); // Use Log
            promise.reject("ERROR_SMS_STOP", "Failed to stop SMS monitoring service: " + e.getMessage());
        }
    }

    /**
     * Starts the native Gmail monitoring Foreground Service.
     * Called from React Native (e.g., BackgroundTaskHandler.startMonitoring).
     */
    @ReactMethod
    public void startGmailMonitoringService(Promise promise) {
         Log.d(TAG, "startGmailMonitoringService ReactMethod called.");
         try {
             Intent serviceIntent = new Intent(reactContext, GmailMonitoringService.class);

             // Start as a Foreground Service
             if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                 reactContext.startForegroundService(serviceIntent);
             } else {
                 reactContext.startService(serviceIntent);
             }

             promise.resolve(true); // Indicate start request was sent
         } catch (Exception e) {
             Log.e(TAG, "Failed to start Gmail monitoring service: " + e.getMessage(), e); // Use Log
             promise.reject("ERROR_GMAIL_START", "Failed to start Gmail monitoring service: " + e.getMessage());
         }
    }

    /**
     * Stops the native Gmail monitoring Foreground Service.
     * Called from React Native (e.g., BackgroundTaskHandler.stopMonitoring).
     */
    @ReactMethod
    public void stopGmailMonitoringService(Promise promise) {
         Log.d(TAG, "stopGmailMonitoringService ReactMethod called.");
        try {
            Intent serviceIntent = new Intent(reactContext, GmailMonitoringService.class);
            reactContext.stopService(serviceIntent);
            promise.resolve(true); // Indicate stop request was sent
        } catch (Exception e) {
             Log.e(TAG, "Failed to stop Gmail monitoring service: " + e.getMessage(), e); // Use Log
            promise.reject("ERROR_GMAIL_STOP", "Failed to stop Gmail monitoring service: " + e.getMessage());
        }
    }

    /**
     * Called by native code (like Headless JS Task or Gmail Service)
     * to emit a threat detection event back to the main React Native JS thread.
     * The event is picked up by NativeEventEmitter listeners in JS.
     * @param eventName The name of the event (e.g., "onNewThreatDetected", "onGmailLinkExpired").
     * @param params Data payload for the event as a WritableMap.
     */
    public static void sendEventToJs(String eventName, WritableMap params) {
        // Ensure the static context is initialized and the JS bridge is ready
        if (staticReactContext != null && staticReactContext.hasActiveCatalystInstance()) {
             try {
                staticReactContext
                     // Fix: Corrected spelling in DeviceEventManagerModule
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params); // Use WritableMap for structured data
                 // Log.d(TAG, "Event '" + eventName + "' emitted successfully."); // Avoid spamming logs
             } catch (Exception e) {
                 Log.e(TAG, "Error emitting event '" + eventName + "' to JS: " + e.getMessage(), e);
             }
        } else {
             // Log this extensively - indicates the JS bridge is not available
             // This happens if the app process is running but the JS engine is stopped (e.g., after a crash or force kill)
             Log.e(TAG, "Attempted to send event '" + eventName + "' but staticReactContext or JS bridge is unavailable.");
        }
    }

    /**
     * Called from the Headless JS Task (SwiftShieldBackgroundTask.js)
     * to trigger the emission of a threat detection event from native.
     * This acts as a bridge from the Headless Task JS to the native module's event emitter.
     * @param eventData A ReadableMap containing the threat details from the Headless Task.
     * @param promise Promise to resolve/reject the JS call.
     */
    @ReactMethod
    public void triggerThreatDetectedEvent(ReadableMap eventData, Promise promise) {
        Log.d(TAG, "triggerThreatDetectedEvent ReactMethod called.");
        try {
             if (eventData != null) {
                 // Manual copy from ReadableMap to WritableMap as Arguments.fromReadableMap
                 // might be missing/deprecated or causing conflicts.
                WritableMap writableEventData = Arguments.createMap();
                ReadableMapKeySetIterator iterator = eventData.keySetIterator();
                while (iterator.hasNextKey()) {
                    String key = iterator.nextKey();
                    ReadableType type = eventData.getType(key);
                    switch (type) {
                        case Null:
                            writableEventData.putNull(key);
                            break;
                        case Boolean:
                            writableEventData.putBoolean(key, eventData.getBoolean(key));
                            break;
                        case Number:
                            writableEventData.putDouble(key, eventData.getDouble(key)); // Use getDouble for numbers
                            break;
                        case String:
                            writableEventData.putString(key, eventData.getString(key));
                            break;
                        case Map:
                            // Recursively copy nested maps if needed, or just put the ReadableMap
                            // If you only need to pass it through, putting the ReadableMap might work
                            writableEventData.putMap(key, eventData.getMap(key));
                            break;
                        case Array:
                            // Recursively copy nested arrays if needed, or just put the ReadableArray
                            writableEventData.putArray(key, eventData.getArray(key));
                            break;
                    }
                }

                BackgroundMonitorModule.sendEventToJs("onNewThreatDetected", writableEventData);
                Log.d(TAG, "triggerThreatDetectedEvent: Event 'onNewThreatDetected' emitted successfully.");
                promise.resolve(true);
             } else {
                 Log.e(TAG, "triggerThreatDetectedEvent: Received invalid event data from JS.");
                 promise.reject("INVALID_DATA", "Received invalid event data from JS.");
             }
        } catch (Exception e) {
            Log.e(TAG, "Error triggering threat event from JS: " + e.getMessage(), e);
            promise.reject("EVENT_ERROR", "Error triggering threat event: " + e.getMessage());
        }
    }

    // You can add other ReactMethods here if needed, e.g., for manual token saving from RN
    // @ReactMethod
    // public void saveGmailCredentials(String accessToken, String refreshToken, double expiryTimestamp, String initialHistoryIdString, Promise promise) {
    //     try {
    //         // Convert expiry from JS double (ms) to Java long (ms)
    //         long expiryMillis = (long) expiryTimestamp;
    //         BigInteger initialHistoryId = new BigInteger(initialHistoryIdString); // Convert string to BigInteger
    //         GmailMonitoringService.saveAndStartCredentials(reactContext, accessToken, refreshToken, expiryMillis, initialHistoryId);
    //         promise.resolve(true);
    //     } catch (Exception e) {
    //         promise.reject("SAVE_CREDS_ERROR", "Failed to save Gmail credentials: " + e.getMessage());
    //     }
    // }
}