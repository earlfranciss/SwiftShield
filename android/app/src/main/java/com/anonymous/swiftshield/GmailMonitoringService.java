package com.anonymous.swiftshield;
// --- Android Imports ---
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service; // Import Service
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.util.Log; // Import Log
import androidx.core.app.NotificationCompat;

// No longer need ContextCompat just for R.drawable/mipmap access
// import androidx.core.content.ContextCompat; // Import ContextCompat
// --- React Native Imports ---
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.HistoryMessageAdded;
import com.facebook.react.bridge.Arguments; // Import Arguments
import com.facebook.react.bridge.WritableMap; // Import WritableMap
import com.facebook.react.bridge.ReadableMapKeySetIterator; // For manual map copying
import com.facebook.react.bridge.ReadableType; // For manual map copying
// --- Google API Imports ---
import com.google.api.client.auth.oauth2.Credential; 
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential; // Import GoogleCredential
import com.google.api.client.http.HttpRequestInitializer; // Import HttpRequestInitializer
import com.google.api.client.http.javanet.NetHttpTransport; // Import NetHttpTransport
import com.google.api.client.json.gson.GsonFactory; // Import GsonFactory
import com.google.api.services.gmail.model.History; // Import History
import com.google.api.services.gmail.model.ListHistoryResponse; // Import ListHistoryResponse
import com.google.api.services.gmail.model.Message; // Import Message
import com.google.api.services.gmail.model.MessagePart; // Import MessagePart
import com.google.api.services.gmail.model.MessagePartBody; // Import MessagePartBody
import com.google.api.services.gmail.model.MessagePartHeader;
import com.google.api.services.gmail.model.HistoryMessageAdded;
// Import Google API exceptions for specific error handling
import com.google.api.client.googleapis.json.GoogleJsonResponseException; // Import GoogleJsonResponseException
// Import DateTime (if needed, seems unused currently)
// import com.google.api.client.util.DateTime;
// --- Java/Util Imports ---
import javax.mail.internet.MimeMessage; // For parsing raw email
import javax.mail.Session;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream; // For MIME parsing
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection; // Import HttpURLConnection
import java.net.URL; // Import URL
import java.nio.charset.StandardCharsets;
import java.util.Collections; // Import Collections
import java.util.Date; // Import Date
import java.util.List; // Import List
import java.util.Properties; // For MIME parsing setup
import java.util.concurrent.Executors; // Import Executors
import java.util.concurrent.ScheduledExecutorService; // Import ScheduledExecutorService
import java.util.concurrent.ScheduledFuture; // Import ScheduledFuture
import java.util.concurrent.TimeUnit; // Import TimeUnit
import java.util.Base64; // Import Base64 (requires API 26+)
import java.util.regex.Matcher; // Import Matcher
import java.util.regex.Pattern; // Import Pattern
import java.math.BigInteger; // Import BigInteger
// --- JSON Imports ---
import org.json.JSONObject; // Import JSONObject
import org.json.JSONArray; // Import JSONArray
// Import BuildConfig - requires it to be generated in your app's package
// You need buildConfigField "String", "BASE_URL", "..." in android/app/build.gradle
import com.anonymous.swiftshield.BuildConfig; // Assuming BuildConfig is in this package
public class GmailMonitoringService extends Service {
    
private static final String TAG = "GmailMonitoringService"; // Use TAG for logging
private static final int NOTIFICATION_ID = 102; // Unique ID for this service's notification
private static final String CHANNEL_ID = "swiftshield_gmail_channel";
private static final String CHANNEL_NAME = "SwiftShield Gmail Monitoring";

// --- INSECURE: Replace with secure storage (e.g., Android Keystore) ---
// **CRITICAL:** Implement secure storage for these tokens!
private static final String PREFS_NAME = "swiftshield_gmail_prefs"; // Dedicated prefs for Gmail tokens
private static final String KEY_ACCESS_TOKEN = "gmail_access_token";
private static final String KEY_REFRESH_TOKEN = "gmail_refresh_token";
private static final String KEY_ACCESS_TOKEN_EXPIRY = "gmail_access_token_expiry"; // Epoch timestamp in milliseconds
private static final String KEY_LAST_HISTORY_ID = "gmail_last_history_id"; // <-- Correct variable name KEY_LAST_HISTORY_ID
// --- END INSECURE ---

private static final int FOREGROUND_SERVICE_TYPE_DATA_SYNC = 8;

private GoogleCredential credentials; // Google API credentials object
private Gmail gmailService; // Gmail API service client
private ScheduledExecutorService scheduler; // For scheduling the polling task
private ScheduledFuture<?> pollingTask; // Reference to the scheduled task
private long pollingIntervalMillis = 60000; // Poll every 1 minute (adjust as needed)

// HandlerThread for background operations
private HandlerThread handlerThread;
private Handler backgroundHandler;

// URL Pattern for basic URL extraction
private static final Pattern URL_PATTERN = Pattern.compile(
    "(https?://[^\\s/$.?#].[^\\s]*)" // Basic URL pattern
);


@Override
public void onCreate() {
    super.onCreate();
    Log.d(TAG, "Service onCreate");

    createNotificationChannel();
    // Start as a Foreground Service with appropriate type (API 31+)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
         // Fix: Use Service.FOREGROUND_SERVICE_TYPE_DATA_SYNC if compileSdk is 31+
         // If you are getting an error here, ensure your compileSdk >= 31
         // and you have the corresponding Android SDK Platform installed.
         // As a fallback for compilation, you could use '0', but that won't provide the correct type metadata.
         // The error message suggests compileSdk might be < 31 or SDK setup issue.
         // Assuming compileSdk >= 31 is intended:
         startForeground(NOTIFICATION_ID, createNotification(), FOREGROUND_SERVICE_TYPE_DATA_SYNC);
    } else {
         // For Android versions older than S (API 31)
         startForeground(NOTIFICATION_ID, createNotification());
    }

    // Initialize HandlerThread for background tasks
    handlerThread = new HandlerThread("GmailPollingThread");
    handlerThread.start();
    backgroundHandler = new Handler(handlerThread.getLooper());

    // Initialize scheduler
    scheduler = Executors.newSingleThreadScheduledExecutor();

    // Load credentials on creation - they might not exist yet if linking happens after service start
    credentials = loadCredentials();
    // Gmail service client is created on first use in getGmailService()
}

@Override
public int onStartCommand(Intent intent, int flags, int startId) {
    Log.d(TAG, "Service onStartCommand");

    // Load credentials here on start command as well, in case they were saved by React Native
    // after onCreate but before this call (e.g., from a deep link).
    if (credentials == null) {
         credentials = loadCredentials();
    }

    // Start the polling task if it's not already running, and credentials are available
    // Check pollingTask state safely
    if (credentials != null && (pollingTask == null || pollingTask.isCancelled() || pollingTask.isDone())) {
        Log.d(TAG, "Credentials available, scheduling polling task...");
        long initialDelay = 5000; // 5 seconds initial delay
        pollingTask = scheduler.scheduleWithFixedDelay(
                new GmailPollingTask(),
                initialDelay,
                pollingIntervalMillis,
                TimeUnit.MILLISECONDS
        );
        Log.d(TAG, "Polling task scheduled.");
    } else if (credentials == null) {
        Log.w(TAG, "No credentials available on start command. Polling task will not start.");
    } else {
         Log.d(TAG, "Polling task already running.");
    }

    // Return START_STICKY to request that the system recreate the service if it's killed
    return START_STICKY;
}

@Override
public void onDestroy() {
    Log.d(TAG, "Service onDestroy");

    // Cancel the polling task and shut down the scheduler
    if (pollingTask != null) {
        pollingTask.cancel(true); // Interrupt the task if it's running
        pollingTask = null;
    }
    if (scheduler != null && !scheduler.isShutdown()) {
        scheduler.shutdownNow(); // Shut down the scheduler pool
    }
     // Stop the background thread
    if (handlerThread != null) {
        handlerThread.quitSafely(); // Ask the thread to exit after current tasks finish
    }

    stopForeground(true); // Remove the notification
    super.onDestroy();
}

@Override
public IBinder onBind(Intent intent) {
    // This service doesn't support binding
    return null;
}

/**
 * Creates the notification channel required for Foreground Services on Android O+.
 */
private void createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW // Use low importance for background task
        );
        channel.setDescription("Monitors your Gmail account for phishing threats in the background.");
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }
}

/**
 * Creates the persistent notification for the Foreground Service.
 * @return The Notification object.
 */
private Notification createNotification() {
    // **CRITICAL:** You need a small icon resource (e.g., ic_notification_small.png or xml)
    // This icon MUST be entirely white with transparency for Android's status bar.
    // Add this file to android/app/src/main/res/drawable/ or mipmap/
    // Example: res/drawable/ic_notification_small.xml or res/mipmap/ic_shield_small.png
    // *** Replace R.mipmap.ic_launcher with your actual small icon resource ID (R.drawable.your_icon_name or R.mipmap.your_icon_name) ***
    // Note: R.mipmap.ic_launcher is the default launcher icon, which is often NOT suitable as a small notification icon.
    int smallIcon = R.drawable.ic_notification_small; // Replace with your actual small icon resource

    // Create an intent to open the app when the notification is tapped (optional but recommended)
    // Assuming your main activity is the one with the launch intent filter
    // Replace MainActivity.class with your main activity class name
    Intent notificationIntent = new Intent(this, MainActivity.class); // Replace MainActivity.class
    notificationIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

    // Use FLAG_IMMUTABLE for API 23+ and FLAG_UPDATE_CURRENT is generally safe.
    int pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        pendingIntentFlags |= PendingIntent.FLAG_IMMUTABLE; // Add FLAG_IMMUTABLE for security on M+
    }

    PendingIntent pendingIntent = PendingIntent.getActivity(
        this,
        0,
        notificationIntent,
        pendingIntentFlags
    );

    NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SwiftShield")
            .setContentText("Monitoring Gmail for phishing...")
            .setSmallIcon(smallIcon) // Set the small icon
            .setPriority(NotificationCompat.PRIORITY_LOW) // Low priority for background task
            .setContentIntent(pendingIntent) // Set the intent to open the app
            .setOngoing(true); // Makes the notification non-dismissible by swiping
    return builder.build();
}

// --- Credential Management ---
// **CRITICAL:** Implement secure storage for tokens (e.g., EncryptedSharedPreferences)!
// The current implementation uses standard SharedPreferences which is INSECURE.
/**
 * Returns a SharedPreferences instance for storing credentials.
 * **REPLACE THIS WITH A SECURE IMPLEMENTATION USING ENCRYPTEDSHAREDPREFERENCES.**
 */
private SharedPreferences getSecureSharedPreferences() {
     // !!! IMPLEMENT SECURE SHRED PREFERENCES HERE !!!
     // Example using Jetpack Security:
     // try {
     //     MasterKey masterKey = new MasterKey.Builder(this)
     //         .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
     //         .build();
     //     return EncryptedSharedPreferences.create(
     //         this,
     //         PREFS_NAME,
     //         masterKey,
     //         EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
     //         EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
     //     );
     // } catch (Exception e) {
     //     Log.e(TAG, "Failed to create EncryptedSharedPreferences", e);
     //     // Fallback to standard SharedPreferences (still insecure!) or handle error
     //     return getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
     // }
     // For demonstration, using regular SharedPreferences:
     Log.w(TAG, "Using INSECURE SharedPreferences for credentials! Replace with secure storage.");
     return getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
}

/**
 * Saves credentials and initial history ID to storage and starts the service.
 * Called from React Native (e.g., from the Deep Link handler after OAuth success).
 * @param context Application context.
 * @param accessToken Google API access token.
 * @param refreshToken Google API refresh token.
 * @param expiryTimestampMillis Access token expiry as epoch milliseconds.
 * @param lastHistoryId Initial history ID from the OAuth response.
 */
 public static void saveAndStartCredentials(Context context, String accessToken, String refreshToken, long expiryTimestampMillis, BigInteger lastHistoryId) {
    Log.d(TAG, "Attempting to save credentials and start service...");
    // Use secure prefs instance here as well
    SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, MODE_PRIVATE); // Still using insecure here for this static method
    SharedPreferences.Editor editor = prefs.edit();
    editor.putString(KEY_ACCESS_TOKEN, accessToken);
    editor.putString(KEY_REFRESH_TOKEN, refreshToken);
    editor.putLong(KEY_ACCESS_TOKEN_EXPIRY, expiryTimestampMillis);
    // Convert BigInteger historyId to String for saving in SharedPreferences
    editor.putString(KEY_LAST_HISTORY_ID, lastHistoryId != null ? lastHistoryId.toString() : "0");
    editor.apply();
    Log.d(TAG, "Credentials and initial history ID saved (INSECURELY). History ID: " + (lastHistoryId != null ? lastHistoryId.toString() : "0"));

    // Start or re-start the service
    Intent serviceIntent = new Intent(context, GmailMonitoringService.class);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(serviceIntent);
    } else {
        context.startService(serviceIntent);
    }
     Log.d(TAG, "GmailMonitoringService start requested.");
}


/**
 * Loads credentials from secure storage.
 * @return GoogleCredential object or null if credentials are not found.
 */
private GoogleCredential loadCredentials() {
    Log.d(TAG, "Attempting to load credentials...");
    SharedPreferences prefs = getSecureSharedPreferences(); // Use secure prefs
    String accessToken = prefs.getString(KEY_ACCESS_TOKEN, null);
    String refreshToken = prefs.getString(KEY_REFRESH_TOKEN, null);
    long expiryMillis = prefs.getLong(KEY_ACCESS_TOKEN_EXPIRY, 0);

    if (refreshToken == null || refreshToken.isEmpty()) {
        Log.w(TAG, "No Google REFRESH token found in storage. Cannot proceed.");
        // Optional: Clear other potentially stale credential parts
        // SharedPreferences.Editor editor = prefs.edit();
        // editor.remove(KEY_ACCESS_TOKEN);
        // editor.remove(KEY_ACCESS_TOKEN_EXPIRY);
        // editor.apply();
        return null;
    }

    if (accessToken == null || refreshToken == null || expiryMillis == 0) {
        Log.w(TAG, "No complete Gmail credentials found in storage.");
        return null;
    }

     NetHttpTransport httpTransport = new NetHttpTransport();
     GsonFactory jsonFactory = GsonFactory.getDefaultInstance();

     // --- TEMPORARY DEBUG: Use setters instead of Builder ---
    try {
        // --- Use the Builder Pattern ---
        GoogleCredential.Builder builder = new GoogleCredential.Builder()
                .setTransport(httpTransport)
                .setJsonFactory(jsonFactory);
                // Provide client secrets needed for potential refresh operations if done locally
                // It's better if refresh happens via your backend, but builder might still need them
                // Ensure these env vars are loaded correctly if needed by the library internally
                // .setClientSecrets(os.getenv("GOOGLE_CLIENT_ID"), os.getenv("GOOGLE_CLIENT_SECRET"));

        // Set tokens if they exist
        if (accessToken != null && !accessToken.isEmpty()) {
            builder.setAccessToken(accessToken);
        }
        if (refreshToken != null && !refreshToken.isEmpty()) {
            builder.setRefreshToken(refreshToken);
        }
        if (expiryMillis > 0) {
            // Check if setExpirationTimeMilliseconds exists, otherwise use setExpiresInSeconds
             try {
                  // Try the potentially newer method first
                  builder.setExpirationTimeMilliseconds(expiryMillis);
             } catch (NoSuchMethodError e) {
                  // Fallback to older method if the above doesn't exist
                  Log.w(TAG, "setExpirationTimeMilliseconds not found, using setExpiresInSeconds fallback.");
                  long expiresInSeconds = (expiryMillis - System.currentTimeMillis()) / 1000;
                  builder.setExpiresInSeconds(expiresInSeconds > 0 ? expiresInSeconds : 0L);
             }
        }

        GoogleCredential credential = builder.build();
        // --- End Builder Pattern ---

        Log.d(TAG, "Credentials loaded via Builder. Access token expires: " + (expiryMillis > 0 ? new Date(expiryMillis) : "N/A or Expired"));
        return credential;

    } catch (Exception e) {
         // Catch potential errors during builder usage (e.g., class not found if deps still wrong)
         Log.e(TAG, "Error building GoogleCredential object: " + e.getMessage(), e);
         return null;
    }
}

/**
 * Refreshes the access token by calling your backend endpoint.
 * This is the preferred method for security (backend uses client secret).
 * @param currentRefreshToken The refresh token.
 * @return The new access token.
 * @throws Exception if refresh fails.
 */
 private String refreshAccessTokenBackend(String currentRefreshToken) throws Exception {
     Log.d(TAG, "Attempting to refresh token via backend endpoint...");
     // Use the generated BuildConfig class to get the base URL
     // Requires `buildConfigField "String", "BASE_URL", "..."` in android/app/build.gradle
     String refreshUrl = BuildConfig.BASE_URL + "/google/refresh-token"; // Correct reference to BuildConfig.BASE_URL

     if (currentRefreshToken == null || currentRefreshToken.isEmpty()) {
         Log.e(TAG, "Cannot refresh token: Refresh token is null or empty.");
         throw new Exception("Refresh token is missing.");
     }

     HttpURLConnection conn = null;
     String newAccessToken = null;
     long newExpiry = 0;

     try {
         URL url = new URL(refreshUrl);
         conn = (HttpURLConnection) url.openConnection();
         conn.setRequestMethod("POST");
         conn.setRequestProperty("Content-Type", "application/json");
         conn.setDoOutput(true);
         conn.setConnectTimeout(15000); // 15 seconds timeout
         conn.setReadTimeout(15000); // 15 seconds timeout

         // Prepare JSON payload to send to your backend
         JSONObject jsonPayload = new JSONObject();
         jsonPayload.put("refresh_token", currentRefreshToken);
         // You might need to send a user identifier if the backend doesn't rely on session/cookie auth
         // jsonPayload.put("user_id", "...");

         try (OutputStream os = conn.getOutputStream()) {
             byte[] input = jsonPayload.toString().getBytes(StandardCharsets.UTF_8);
             os.write(input, 0, input.length);
         }

         int responseCode = conn.getResponseCode();
         Log.d(TAG, "Backend refresh endpoint response code: " + responseCode);

         if (responseCode >= 200 && responseCode < 300) { // Success range
             try (BufferedReader br = new BufferedReader(
                  new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                 StringBuilder response = new StringBuilder();
                 String responseLine;
                 while ((responseLine = br.readLine()) != null) {
                     response.append(responseLine.trim());
                 }
                 JSONObject jsonResponse = new JSONObject(response.toString());
                 newAccessToken = jsonResponse.optString("access_token");
                 newExpiry = jsonResponse.optLong("expiry_timestamp_ms", 0); // Assume backend returns expiry timestamp in milliseconds

                 if (newAccessToken != null && !newAccessToken.isEmpty() && newExpiry > 0) {
                     // Save the new credentials securely (REPLACE SharedPreferences)
                     SharedPreferences prefs = getSecureSharedPreferences(); // Use secure prefs
                     SharedPreferences.Editor editor = prefs.edit();
                     editor.putString(KEY_ACCESS_TOKEN, newAccessToken);
                     editor.putString(KEY_REFRESH_TOKEN, currentRefreshToken); // Keep refresh token
                     editor.putLong(KEY_ACCESS_TOKEN_EXPIRY, newExpiry);
                     editor.apply();

                     Log.d(TAG, "Token refreshed and saved successfully via backend.");
                     return newAccessToken; // Return the new access token
                 } else {
                      Log.e(TAG, "Backend refresh endpoint returned invalid data (missing token/expiry).");
                      throw new Exception("Backend refresh returned invalid data.");
                 }
             }
         } else {
             // Handle HTTP error response from backend
             String errorBody = "";
              try (BufferedReader br = new BufferedReader(
                   new InputStreamReader(conn.getErrorStream(), StandardCharsets.UTF_8))) {
               String responseLine;
               while ((responseLine = br.readLine()) != null) {
                   errorBody += responseLine.trim();
               }
           } catch (Exception ignored) {}
           Log.e(TAG, "Backend refresh failed. Response Code: " + responseCode + ", Body: " + errorBody);
           throw new Exception("Failed to refresh token via backend. Code: " + responseCode);
         }
     } finally {
          if (conn != null) {
              conn.disconnect(); // Ensure connection is closed
          }
     }
 }

/**
 * Gets the Gmail service client, handling credential loading and refresh.
 * Call this method before making any Gmail API requests.
 * @return Initialized Gmail service client or null if credentials fail.
 */
private Gmail getGmailService() {
    // Check if existing credentials need refresh or are missing
    boolean needsRefresh = false;
    if (credentials != null) {
        long now = System.currentTimeMillis();
        long expiry = credentials.getExpirationTimeMilliseconds();
        // Refresh if expired or expires very soon (e.g., within the next 5 minutes to be safe)
        // Also check if the access token string is null or empty on the credential object itself
        needsRefresh = credentials.getAccessToken() == null || credentials.getAccessToken().isEmpty() || expiry <= now + 300000; // 5 minutes
        if (needsRefresh) {
             Log.d(TAG, "Access token needs refresh. Current expiry: " + new Date(expiry) + ", Now: " + new Date(now));
        }
    } else {
        // No credentials loaded, attempt to load them from storage
        Log.d(TAG, "No credentials in memory, attempting to load from storage.");
        credentials = loadCredentials();
        // If still null after loading, we can't proceed
        if (credentials == null) {
             Log.w(TAG, "Cannot initialize Gmail service: No credentials loaded after attempt.");
             return null;
        }
         // Now that we loaded, re-check if the loaded token is already expired
         long now = System.currentTimeMillis();
         long expiry = credentials.getExpirationTimeMilliseconds();
         needsRefresh = credentials.getAccessToken() == null || credentials.getAccessToken().isEmpty() || expiry <= now + 300000;
         if(needsRefresh) {
             Log.d(TAG, "Loaded credentials are already expired or near expiry.");
         } else {
             Log.d(TAG, "Loaded credentials are valid.");
         }
    }

    // If refresh is needed, attempt it
    if (needsRefresh) {
        Log.d(TAG, "Attempting to refresh access token...");
        // Check if we actually have a refresh token to use
        if (credentials.getRefreshToken() == null || credentials.getRefreshToken().isEmpty()) {
            Log.e(TAG, "Cannot refresh token: No refresh token available.");
             invalidateCredentials(); // Clear stored credentials as they are useless
             // Notify React Native UI that Gmail linking is broken/expired
             WritableMap eventData = Arguments.createMap(); // Fix: Use Arguments.createMap()
             eventData.putString("message", "No refresh token available. Please re-link Gmail.");
             BackgroundMonitorModule.sendEventToJs("onGmailLinkExpired", eventData); // Send event to JS
             return null; // Cannot get service without valid credentials
        }
        try {
             // Use the refresh token loaded with credentials
            String newAccessToken = refreshAccessTokenBackend(credentials.getRefreshToken());
             // Update credentials object in memory (SharedPreferences is updated by refreshAccessTokenBackend)
             credentials.setAccessToken(newAccessToken); // Set the newly obtained access token
             // Update expiry from the newly saved value in secure storage
             credentials.setExpirationTimeMilliseconds(getSecureSharedPreferences().getLong(KEY_ACCESS_TOKEN_EXPIRY, 0));

            Log.d(TAG, "Token refreshed successfully. New expiry: " + new Date(credentials.getExpirationTimeMilliseconds()));

        } catch (Exception e) {
            Log.e(TAG, "Failed to refresh access token: " + e.getMessage(), e);
            // Handle refresh failure: invalidate credentials, notify user they need to re-link
            invalidateCredentials(); // Clear stored credentials
            // Notify React Native UI that Gmail linking is broken/expired
            WritableMap eventData = Arguments.createMap(); // Fix: Use Arguments.createMap()
            eventData.putString("message", e.getMessage());
            BackgroundMonitorModule.sendEventToJs("onGmailLinkExpired", eventData); // Send event to JS
            // Cannot get service without valid credentials
            return null;
        }
    }

    // Build or update the Gmail service client using the current/refreshed credentials
    if (gmailService == null) {
        Log.d(TAG, "Building new Gmail service client...");
        NetHttpTransport httpTransport = new NetHttpTransport();
        GsonFactory jsonFactory = GsonFactory.getDefaultInstance();

        // Gmail.Builder requires HttpRequestInitializer, which GoogleCredential implements
        // If you get 'cannot find symbol' for .setHttpRequestInitializer(credentials) on Builder,
        // or for Gmail.Builder itself, verify your google-api-client version in build.gradle
        gmailService = new Gmail.Builder(
                httpTransport, // Set HTTP transport
                jsonFactory, // Set JSON factory
                credentials) // Set the credential object (implements HttpRequestInitializer)
                .setApplicationName("SwiftShield") // Set your application name
                // Add request timeout if needed
                // .setHttpRequestInitializer(request -> request.setConnectTimeout(15000).setReadTimeout(15000))
                .build();
         Log.d(TAG, "Gmail service client built.");
    } else {
         // If service already exists, ensure it's using the latest credential object (after refresh)
         // If you get 'cannot find symbol' for .setHttpRequestInitializer(credentials) on Gmail,
         // verify your google-api-client version in build.gradle
        //  gmailService.setHttpRequestInitializer(credentials); // Set the updated credential object
         Log.d(TAG, "Updated Gmail service client with current credentials.");
    }

    return gmailService;
}

 /**
  * Invalidates credentials in storage and memory.
  */
 private void invalidateCredentials() {
    Log.d(TAG, "Invalidating Gmail credentials...");
    SharedPreferences prefs = getSecureSharedPreferences(); // Use secure prefs
    SharedPreferences.Editor editor = prefs.edit();
    editor.remove(KEY_ACCESS_TOKEN);
    editor.remove(KEY_REFRESH_TOKEN);
    editor.remove(KEY_ACCESS_TOKEN_EXPIRY);
    editor.remove(KEY_LAST_HISTORY_ID); // Also clear history ID as it's tied to the account
    editor.apply();
    credentials = null; // Clear in memory
    gmailService = null; // Invalidate the service client
    Log.d(TAG, "Gmail credentials invalidated.");
 }


// --- Polling Task ---
/**
 * Runnable task to perform periodic Gmail polling on a background thread.
 */
private class GmailPollingTask implements Runnable {
    private static final String USER_ID = "me"; // Special value for the authenticated user
    private static final int MAX_HISTORY_RESULTS = 10; // How many history records to fetch per poll

    @Override
    public void run() {
        Log.d(TAG, "Running Gmail polling task...");
        // Check if thread is interrupted (service is stopping)
        if (Thread.currentThread().isInterrupted()) {
            Log.d(TAG, "Polling task interrupted, stopping.");
            return;
        }

        // Using post ensures it runs sequentially on the handler thread
        backgroundHandler.post(this::performPollingLogic);
    }

    /**
     * Contains the core logic for polling Gmail using the History API.
     * Runs on the backgroundHandler thread.
     */
    private void performPollingLogic() {
         Log.d(TAG, "Performing Gmail polling logic...");
        // Check if thread is interrupted before starting
        if (Thread.currentThread().isInterrupted()) {
             Log.d(TAG, "Polling logic interrupted before execution.");
             return;
         }

        // Get the Gmail service client (handles loading/refreshing credentials)
        Gmail service = getGmailService();

        if (service == null) {
            Log.w(TAG, "Gmail service is not available. Skipping poll.");
            return;
        }

        SharedPreferences prefs = getSecureSharedPreferences(); // Use secure prefs
        // Retrieve last history ID as a String and convert to BigInteger
        String lastHistoryIdString = prefs.getString(KEY_LAST_HISTORY_ID, "0"); // Fix: Use correct key name KEY_LAST_HISTORY_ID
        BigInteger lastHistoryId = new BigInteger(lastHistoryIdString); // Read as String, parse to BigInteger
        Log.d(TAG, "Polling from historyId: " + lastHistoryId);

        try {
            // Use history.list to get changes since the last historyId
            // Filter by messageAdded to only get new messages
            // If you get 'cannot find symbol' for .history() or .list(),
            // verify your google-api-services-gmail version in build.gradle
            ListHistoryResponse historyResponse = service.history().list(USER_ID)
                    .setStartHistoryId(lastHistoryId) // Use BigInteger directly
                    .setHistoryTypes(Collections.singletonList("messageAdded")) // Only get new messages
                    .setMaxResults((long) MAX_HISTORY_RESULTS) // Limit results per page
                     // .setFields("historyId,nextPageToken,history") // Specify fields to fetch (optimization)
                    .execute(); // Execute the API call
            Log.d(TAG, "history.list executed. Got " + (historyResponse != null && historyResponse.getHistory() != null ? historyResponse.getHistory().size() : 0) + " history records.");


            // Get the new historyId. This is the ID *after* all changes returned in *this* response.
            BigInteger nextHistoryId = historyResponse != null ? historyResponse.getHistoryId() : null;

            // Always save the latest historyId received if it's newer and not null
            if (nextHistoryId != null && nextHistoryId.compareTo(lastHistoryId) > 0) { // Compare BigIntegers
                prefs.edit().putString(KEY_LAST_HISTORY_ID, nextHistoryId.toString()).apply(); // Save BigInteger as String
                Log.d(TAG, "Saved new historyId: " + nextHistoryId.toString());
            } else if (nextHistoryId != null) {
                 Log.d(TAG, "Received historyId (" + nextHistoryId.toString() + ") is not newer than current (" + lastHistoryId.toString() + "). Not saving.");
            } else {
                 Log.d(TAG, "Received null historyId from API response.");
            }


            // Process history records if any
            List<History> history = historyResponse != null ? historyResponse.getHistory() : null; // Get the list of History objects
            if (history != null && !history.isEmpty()) {
                Log.d(TAG, "Processing " + history.size() + " history records...");
                for (History record : history) {
                    // Check if thread is interrupted during history processing
                    if (Thread.currentThread().isInterrupted()) {
                        Log.d(TAG, "History processing interrupted, stopping.");
                        return;
                    }
                    // Process added messages
                    // If you get 'cannot find symbol' for History.MessagesAdded,
                    // verify your google-api-services-gmail version in build.gradle
                    if (record.getMessagesAdded() != null) {
                         Log.d(TAG, "Found " + record.getMessagesAdded().size() + " messages added in this history record.");
                         // Iterate through messages added in this history record
                        for (HistoryMessageAdded addedMsg : record.getMessagesAdded()) {
                            Message msgRef = addedMsg.getMessage(); // This is a partial Message object (just ID and threadId)
                            if (msgRef != null && msgRef.getId() != null) {
                                Log.d(TAG, "Processing new message reference. ID: " + msgRef.getId());
                                 // Fetch the full message details and process it
                                 fetchAndProcessMessage(service, msgRef.getId());
                            }
                        }
                    }
                    // You could also check record.getMessagesDeleted(), record.getLabelsAdded(), etc.
                }
            } else {
                Log.d(TAG, "No new history records (messagesAdded) found in this poll.");
            }

             // --- Handle Pagination ---
             // If there's a nextPageToken, it means there are more history results than MAX_HISTORY_RESULTS.
             // For simplicity, this example only processes the first page.
             if (historyResponse != null && historyResponse.getNextPageToken() != null) {
                 Log.w(TAG, "Pagination needed! More history records might be available starting from next page token. Implement logic to fetch next pages.");
                  // To process all historical changes since the last poll, you would need
                  // to loop using setPageToken(historyResponse.getNextPageToken()) until nextPageToken is null.
             }


        } catch (GoogleJsonResponseException e) {
             // Handle specific Google API errors
             if (e.getStatusCode() == 401 || e.getStatusCode() == 403) {
                 Log.e(TAG, "Google API call failed (401/403) during history.list. Token refresh attempted already?", e);
                  // getGmailService already handles token refresh before this.
                  // This likely means re-linking is needed (refresh token is invalid).
                  // Invalidate credentials and notify JS.
                  invalidateCredentials(); // Ensure credentials are clear
                  WritableMap eventData = Arguments.createMap(); // Fix: Use Arguments.createMap()
                  eventData.putString("message", "Authentication failed. Please re-link Gmail.");
                 BackgroundMonitorModule.sendEventToJs("onGmailLinkExpired", eventData); // Notify JS
             } else if (e.getStatusCode() == 400 && e.getMessage() != null && e.getMessage().contains("invalidStartHistoryId")) {
                  // This happens if the stored historyId is too old or invalid.
                  Log.w(TAG, "Invalid startHistoryId. Clearing and starting from latest.", e);
                  prefs.edit().remove(KEY_LAST_HISTORY_ID).apply(); // Clear invalid ID
                  // Next poll will start from the current state (historyId=0 or latest).
                  // Could also notify user they might have missed some history.
             }
             else {
                 Log.e(TAG, "Google API error during history.list: " + e.getMessage(), e);
                 // Log the error and continue with the polling schedule.
             }
        } catch (Exception e) {
            Log.e(TAG, "Error during Gmail polling task: " + e.getMessage(), e);
            // Log the error and continue with the polling schedule.
        }
    }

    /**
     * Fetches the full message details using the Gmail API and triggers scanning.
     * Runs on the backgroundHandler thread.
     * @param service The initialized Gmail service client.
     * @param messageId The ID of the message to fetch.
     */
    private void fetchAndProcessMessage(Gmail service, String messageId) { // messageId is a parameter here
        Log.d(TAG, "Fetching message: " + messageId);
        // Check if thread is interrupted
        if (Thread.currentThread().isInterrupted()) {
             Log.d(TAG, "Fetch/Process message task interrupted, stopping.");
             return;
         }
        try {
             // Fetch the message in 'full' format to get payload (body and headers)
             // If you get 'cannot find symbol' for .users().messages().get(),
             // verify your google-api-services-gmail version in build.gradle
            Message message = service.users().messages().get(USER_ID, messageId).setFormat("full").execute();
            Log.d(TAG, "Message fetched. ID: " + message.getId());

            // --- Basic Filtering: Ignore Sent/Draft/Spam/Trash ---
            List<String> labelIds = message != null ? message.getLabelIds() : null;
            if (labelIds != null) {
                 if (labelIds.contains("SENT") || labelIds.contains("DRAFT") || labelIds.contains("SPAM") || labelIds.contains("TRASH")) {
                     Log.d(TAG, "Ignoring message " + messageId + " with labels: " + labelIds);
                     return; // Skip processing if it's a sent/draft/spam/trash message
                 }
            } else {
                Log.d(TAG, "No labels found for message " + messageId + ", proceeding.");
            }


            // --- Extract Headers ---
            String sender = "Unknown";
            String subject = "No Subject";
            String date = null; // RFC 2822 format date string
            if (message != null && message.getPayload() != null && message.getPayload().getHeaders() != null) {
                for (com.google.api.services.gmail.model.MessagePartHeader header : message.getPayload().getHeaders()) {
                    switch (header.getName()) {
                        case "From": sender = header.getValue(); break;
                        case "Subject": subject = header.getValue(); break;
                        case "Date": date = header.getValue(); break; // RFC 2822 format
                        // Add other headers like 'To', 'Delivered-To', 'Received' if needed for analysis
                    }
                }
            }
             Log.d(TAG, "Extracted headers from message " + messageId + ": Sender='" + sender + "', Subject='" + subject + "'");


            // --- Extract Body Content (Plain Text and HTML) ---
            String bodyPlain = null;
            String bodyHtml = null;
            // Ensure message and payload are not null before getting text parts
             if (message != null && message.getPayload() != null) {
                 List<String> textParts = getEmailTextParts(message.getPayload());
                  Log.d(TAG, "getEmailTextParts returned " + textParts.size() + " parts for message " + messageId);
                  for (String part : textParts) {
                      // The part string is "mimeType:decodedContent"
                      // Fix: Get the string content AFTER the prefix
                     if (part != null && part.startsWith("text/plain:")) {
                          bodyPlain = part.substring("text/plain:".length());
                     } else if (part != null && part.startsWith("text/html:")) {
                          bodyHtml = part.substring("text/html:".length());
                     }
                  }
             } else {
                 Log.w(TAG, "Message or payload is null for message " + messageId + ". Cannot extract body.");
             }


            Log.d(TAG, "Extracted body lengths for message " + messageId + ": Plain=" + (bodyPlain != null ? bodyPlain.length() : 0) + ", HTML=" + (bodyHtml != null ? bodyHtml.length() : 0));


            // --- Extract URLs from body (basic) ---
            List<String> extractedUrls = new java.util.ArrayList<>();
            if (bodyPlain != null) extractedUrls.addAll(extractUrlsFromString(bodyPlain));
            if (bodyHtml != null) extractedUrls.addAll(extractUrlsFromString(bodyHtml));
            Log.d(TAG, "Extracted " + extractedUrls.size() + " potential URLs from message " + messageId);


            // Send extracted data to backend for scanning
            // Pass the messageId to the backend scan function so it can be included in the log details
            sendEmailDataToBackendForScan(messageId, sender, subject, date, bodyPlain, bodyHtml, extractedUrls);


            // --- Optional: Mark the email as read after processing ---
            // Requires 'gmail.modify' scope. If you only have 'gmail.readonly', skip this.
            // Consider the UX impact - marking as read automatically might not be desired by the user.
            // try {
            //     service.users().messages().modify(USER_ID, messageId, new ModifyMessageRequest().setAddLabelIds(Collections.singletonList("READ"))).execute();
            //     Log.d(TAG, "Marked message " + messageId + " as read.");
            // } catch (Exception e) {
            //     Log.w(TAG, "Failed to mark message " + messageId + " as read: " + e.getMessage());
            // }


        } catch (GoogleJsonResponseException e) {
             // Handle specific Google API errors during fetch
             if (e.getStatusCode() == 401 || e.getStatusCode() == 403) {
                 Log.e(TAG, "Google API call failed fetching message " + messageId + " (401/403).", e);
                 // getGmailService already handles token refresh. This likely means re-linking is needed.
                  invalidateCredentials(); // Ensure credentials are clear
                  WritableMap eventData = Arguments.createMap(); // Fix: Use Arguments.createMap()
                  eventData.putString("message", "Authentication failed. Please re-link Gmail.");
                 BackgroundMonitorModule.sendEventToJs("onGmailLinkExpired", eventData); // Notify JS
             } else if (e.getStatusCode() == 404) {
                  Log.w(TAG, "Message not found (404): " + messageId + ". Possibly already deleted or moved.", e);
             }
             else {
                 Log.e(TAG, "Google API error fetching message " + messageId + ": " + e.getMessage(), e);
             }
        }
        catch (Exception e) {
            Log.e(TAG, "Error fetching or processing message " + messageId + ": " + e.getMessage(), e);
        }
    }


    /**
     * Recursive helper to find and decode text parts from a message payload.
     * @param part The message part to process.
     * @return A list of strings, each in the format "mimeType:decodedContent".
     */
    private List<String> getEmailTextParts(MessagePart part) {
        List<String> textParts = new java.util.ArrayList<>();
        if (part == null) {
            Log.w(TAG, "getEmailTextParts received null part.");
            return textParts; // Return empty list for null input
        }

        String mimeType = part.getMimeType();
        // Safely get body and its encoding/data
        MessagePartBody body = part.getBody();
        // If you get 'cannot find symbol' for .getEncoding(), verify your google-api-services-gmail version
        // String bodyEncoding = (body != null) ? body.getEncoding() : null;
        String bodyData = (body != null) ? body.getData() : null;

         // Handle text parts (text/plain, text/html, etc.)
        if (mimeType != null && mimeType.startsWith("text/")) {
             // Check if body data is present and base64 encoded
             if (bodyData != null) {
                  try {
                      // Decode Base64 URL-safe string (used by Gmail API)
                      // Requires API 26+
                      byte[] decodedBytes = Base64.getUrlDecoder().decode(bodyData);
                      // Safely get charset from headers, default to UTF-8
                       String charset = getCharsetFromHeaders(part.getHeaders());
                      String decodedContent = new String(decodedBytes, charset);
                      textParts.add(mimeType + ":" + decodedContent);
                       Log.d(TAG, "Decoded text part: " + mimeType + ", length: " + decodedContent.length());
                  } catch (IllegalArgumentException e) {
                      Log.e(TAG, "Error decoding Base64 email part (" + mimeType + "): " + e.getMessage());
                       textParts.add(mimeType + ":" + "DECODING_FAILED"); // Add placeholder if decoding fails
                  } catch (Exception e) {
                       // Catch other potential exceptions during decoding/string conversion
                       Log.e(TAG, "Unexpected error decoding Base64 email part (" + mimeType + "): " + e.getMessage(), e);
                        textParts.add(mimeType + ":" + "DECODING_FAILED"); // Add placeholder
                  }
                  // TODO: Handle other encodings like "quoted-printable" if necessary
             } else if (bodyData != null) {
                  // Handle plain text that is not base64 encoded (less common for large bodies from API)
                  // Attempt a simple base64 decode just in case it was standard base64, otherwise treat as raw text
                   try {
                        // Use standard Base64 decoder first
                        byte[] decodedBytes = Base64.getDecoder().decode(bodyData);
                         String charset = getCharsetFromHeaders(part.getHeaders());
                          String decodedContent = new String(
                              decodedBytes,
                              charset
                          );
                         textParts.add(mimeType + ":" + decodedContent);
                         Log.d(TAG, "Processed non-Base64 text part (standard Base64 decode): " + mimeType + ", length: " + decodedContent.length());
                   } catch (IllegalArgumentException e) {
                        // If standard Base64 decode failed, assume it's already plain text
                        Log.d(TAG, "Body data not standard Base64, assuming plain text for: " + mimeType);
                       textParts.add(mimeType + ":" + bodyData);
                   } catch (Exception e) {
                       Log.e(TAG, "Error processing assumed plain text part (" + mimeType + "): " + e.getMessage(), e);
                        textParts.add(mimeType + ":" + "PROCESSING_FAILED");
                   }

             } else {
                 // Body data is empty or null
                 Log.d(TAG, "Empty body data for text part: " + mimeType);
                 textParts.add(mimeType + ":" + "");
             }
        }
         // Handle multipart parts recursively
        else if (mimeType != null && mimeType.startsWith("multipart/")) {
            if (part.getParts() != null) {
                 Log.d(TAG, "Processing multipart part: " + mimeType + " with " + part.getParts().size() + " sub-parts.");
                for (MessagePart subPart : part.getParts()) {
                    textParts.addAll(getEmailTextParts(subPart)); // Recurse into sub-parts
                }
            } else {
                Log.w(TAG, "Multipart part has no sub-parts: " + mimeType);
            }
        }
         // Ignore other MIME types like image, application (attachments)
        else {
             // Log.d(TAG, "Ignoring non-text/multipart part: " + mimeType); // Too verbose
        }

        return textParts;
    }

     /**
      * Extracts the charset from the Content-Type header.
      * If you get 'cannot find symbol' for MessagePartHeader or .getName(), .getValue(),
      * verify your google-api-services-gmail version in build.gradle.
      * @param headers List of MessagePartHeader objects.
      * @return The charset string, defaults to "UTF-8".
      */
     private String getCharsetFromHeaders(List<com.google.api.services.gmail.model.MessagePartHeader> headers) {
         if (headers != null) {
             for (com.google.api.services.gmail.model.MessagePartHeader header : headers) {
                 if ("Content-Type".equalsIgnoreCase(header.getName()) && header.getValue() != null) {
                     // Example: "text/plain; charset=UTF-8"
                     String contentType = header.getValue();
                     String[] parts = contentType.split(";");
                     for (String part : parts) {
                         String trimmedPart = part.trim();
                         if (trimmedPart.toLowerCase().startsWith("charset=")) {
                             String charset = trimmedPart.substring("charset=".length());
                             // Remove quotes if present
                             if (charset.startsWith("\"") && charset.endsWith("\"")) {
                                 charset = charset.substring(1, charset.length() - 1);
                             }
                              // Basic validation - ensure it's not empty
                             if (!charset.isEmpty()) {
                                 return charset;
                             }
                         }
                     }
                 }
             }
         }
         // Default charset if not found in headers
         return "UTF-8";
     }


     /**
      * Basic helper to extract URLs from a string using a simple regex.
      * @param text The string content (plain text or stripped HTML).
      * @return A list of extracted URLs.
      */
     private List<String> extractUrlsFromString(String text) {
         List<String> urls = new java.util.ArrayList<>();
         if (text == null) return urls;

         Matcher matcher = URL_PATTERN.matcher(text); // Use the compiled Pattern
         while (matcher.find()) {
             urls.add(matcher.group(1)); // Group 1 is the URL in the pattern
         }
         return urls;
     }


    // --- Backend Communication ---
    /**
     * Sends extracted email data to the backend for scanning.
     * Runs on the backgroundHandler thread.
     * @param messageId The original Gmail message ID.
     * @param sender The email sender.
     * @param subject The email subject.
     * @param date The email date string.
     * @param bodyPlain The plain text body (can be null).
     * @param bodyHtml The HTML body (can be null).
     * @param extractedUrls List of URLs extracted client-side (can be empty).
     */
    private void sendEmailDataToBackendForScan(String messageId, String sender, String subject, String date, String bodyPlain, String bodyHtml, List<String> extractedUrls) {
         Log.d(TAG, "Sending email data to backend for scanning: Message ID=" + messageId);
         // Use the generated BuildConfig.BASE_URL
         String scanUrl = BuildConfig.BASE_URL + "/scan-email"; // Correct reference

         HttpURLConnection conn = null; // Use HttpURLConnection
         try {
             URL url = new URL(scanUrl);
             conn = (HttpURLConnection) url.openConnection();
             conn.setRequestMethod("POST");
             conn.setRequestProperty("Content-Type", "application/json");
             conn.setDoOutput(true);
             conn.setConnectTimeout(15000); // 15 seconds timeout
             conn.setReadTimeout(15000); // 15 seconds timeout

              // Add cookies or authorization headers if required by your backend
              // For a background service, token-based auth (API key or Bearer token) is usually better.
              // jsonPayload.put("user_id", "..."); // Include user ID if backend needs it for auth/logging

             // Prepare JSON payload to send to backend
             JSONObject jsonPayload = new JSONObject();
             jsonPayload.put("message_id", messageId); // Include original Gmail message ID
             jsonPayload.put("source", sender); // Use 'source' to match backend log structure
             jsonPayload.put("subject", subject);
             if (date != null) jsonPayload.put("date", date);
             if (bodyPlain != null) jsonPayload.put("body_plain", bodyPlain);
             if (bodyHtml != null) jsonPayload.put("body_html", bodyHtml);
             jsonPayload.put("detected_urls", new JSONArray(extractedUrls)); // Convert List to JSON array
             // Add other relevant metadata like user_id if backend needs it and it's available here
             // jsonPayload.put("user_id", "...");


             Log.d(TAG, "Sending JSON payload to backend (partial): " + jsonPayload.toString().substring(0, Math.min(jsonPayload.toString().length(), 500)) + "...");

             try (OutputStream os = conn.getOutputStream()) {
                 byte[] input = jsonPayload.toString().getBytes(StandardCharsets.UTF_8);
                 os.write(input, 0, input.length);
             }

             int responseCode = conn.getResponseCode();
             Log.d(TAG, "Backend scan response code for message " + messageId + ": " + responseCode);

             if (responseCode >= 200 && responseCode < 300) { // Success range
                 try (BufferedReader br = new BufferedReader(
                      new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                     StringBuilder response = new StringBuilder();
                     String responseLine;
                     while ((responseLine = br.readLine()) != null) {
                        response.append(responseLine.trim());
                     }
                     JSONObject jsonResponse = new JSONObject(response.toString());
                     // Pass the original messageId to the handler so it can include it in the event data
                     handleScanResult(jsonResponse, messageId); // Pass messageId to handler
                 }
             } else {
                  // Handle HTTP error response from backend
                  String errorBody = "";
                   try (BufferedReader br = new BufferedReader(
                        new InputStreamReader(conn.getErrorStream(), StandardCharsets.UTF_8))) {
                       String responseLine;
                       while ((responseLine = br.readLine()) != null) {
                           errorBody += responseLine.trim();
                       }
                   } catch (Exception ignored) {}
                  Log.e(TAG, "Backend scan failed for message " + messageId + ". Response Code: " + responseCode + ", Body: " + errorBody);
                  // Decide if you need to notify UI about the *scanning failure*
                  // For now, just log.
             }

         } catch (Exception e) {
             Log.e(TAG, "Error sending email data to backend or processing response for message " + messageId + ": " + e.getMessage(), e);
             // Decide if you need to notify UI about the *scanning failure*
             // For now, just log.
         } finally {
             if (conn != null) {
                 conn.disconnect(); // Ensure connection is closed
             }
         }
    }

    /**
     * Processes the scan result received from the backend.
     * Runs on the backgroundHandler thread.
     * @param backendResponse The JSON response from the backend's /scan-email endpoint.
     * @param originalMessageId The original Gmail message ID associated with this scan.
     */
    private void handleScanResult(JSONObject backendResponse, String originalMessageId) {
        Log.d(TAG, "Handling backend scan result...");
        // Log the full response if debugging: Log.d(TAG, backendResponse.toString());

        try {
            // Check for a backend error field
            if (backendResponse.has("error")) {
                String errorMsg = backendResponse.optString("error");
                Log.e(TAG, "Backend scan result indicates error: " + errorMsg);
                // Handle backend-specific errors if needed (e.g., invalid format sent)
                return;
            }

            // Assume a successful scan returns log_details
            if (backendResponse.has("log_details")) {
                JSONObject logDetails = backendResponse.getJSONObject("log_details");

                boolean isPhishing = logDetails.optBoolean("is_phishing", false) || "high".equals(logDetails.optString("severity"));

                if (isPhishing) { // Fix: Corrected variable name from isPhhing
                    Log.d(TAG, "Phishing detected in email! Preparing to send event to JS.");

                     // Extract data needed for the notification/log entry in JS
                     // This structure MUST match what BackgroundTaskHandler.js's handleNewThreatDetected expects
                     WritableMap eventData = Arguments.createMap(); // Use Arguments.createMap()
                     eventData.putString("type", "email"); // Event type
                     eventData.putString("detectionId", logDetails.optString("_id", "unknown")); // Backend's log ID, default "unknown"
                     eventData.putString("sender", logDetails.optString("source", "Unknown Sender")); // Sender
                     eventData.putString("subject", logDetails.optString("subject", "No Subject")); // Subject
                     // Create a short preview from backend preview or body, default if missing
                     String previewContent = logDetails.optString("preview", logDetails.optString("body_plain", logDetails.optString("body_html", "")));
                     // Ensure preview content isn't null before taking substring
                     if (previewContent != null) {
                         eventData.putString("preview", previewContent.substring(0, Math.min(previewContent.length(), 100)) + "...");
                     } else {
                         eventData.putString("preview", ""); // Empty preview if no body content found
                     }

                     // Pass the original Gmail messageId (use the one passed into handleScanResult)
                     eventData.putString("messageId", originalMessageId); // Use the passed originalMessageId

                     // Add other fields you want to pass in the notification payload / log entry in JS
                     // Example: eventData.putString("detectedUrl", logDetails.optString("detected_url"));

                     // Send event to React Native using the static helper method in BackgroundMonitorModule
                     BackgroundMonitorModule.sendEventToJs("onNewThreatDetected", eventData);
                     Log.d(TAG, "'onNewThreatDetected' event sent to JS for email threat.");

                } else {
                    Log.d(TAG, "Email scan complete, no phishing detected for message.");
                    // Optionally emit a "clean" event or log this quietly in JS if needed
                    // For now, just log native-side.
                }
            } else {
                 Log.w(TAG, "Backend scan response is missing 'log_details'. Unexpected format?");
                 // Handle unexpected response structure - maybe log an error backend-side
            }

        } catch (Exception e) {
            Log.e(TAG, "Error processing backend scan result JSON: " + e.getMessage(), e);
             // Log the error but don't crash the service
        }
    }
}
}