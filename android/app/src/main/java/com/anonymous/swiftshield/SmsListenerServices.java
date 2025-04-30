package com.anonymous.swiftshield;

import com.anonymous.swiftshield.R;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import androidx.core.app.NotificationCompat;
import com.facebook.react.HeadlessJsTaskService;
import org.json.JSONObject;

public class SmsListenerServices extends Service {
    private static final int NOTIFICATION_ID = 1;
    private static final String CHANNEL_ID = "SwiftShieldSmsMonitor";
    private SmsReceiver smsReceiver;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, createNotification());
        registerSmsReceiver();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (smsReceiver != null) {
            unregisterReceiver(smsReceiver);
            smsReceiver = null;
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "SwiftShield SMS Monitor",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Background service for monitoring SMS messages");
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }

    private Notification createNotification() {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SwiftShield Protection Active")
            .setContentText("Monitoring SMS messages for phishing attempts")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setPriority(NotificationCompat.PRIORITY_LOW);

        return builder.build();
    }

    private void registerSmsReceiver() {
        if (smsReceiver == null) {
            smsReceiver = new SmsReceiver();
            IntentFilter filter = new IntentFilter();
            filter.addAction(Telephony.Sms.Intents.SMS_RECEIVED_ACTION);
            registerReceiver(smsReceiver, filter);
        }
    }

    private class SmsReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) {
                Bundle bundle = intent.getExtras();
                if (bundle != null) {
                    Object[] pdus = (Object[]) bundle.get("pdus");
                    if (pdus != null) {
                        StringBuilder messageBody = new StringBuilder();
                        String sender = null;

                        for (Object pdu : pdus) {
                            SmsMessage sms = SmsMessage.createFromPdu((byte[]) pdu);
                            messageBody.append(sms.getMessageBody());
                            if (sender == null) {
                                sender = sms.getOriginatingAddress();
                            }
                        }

                        try {
                            JSONObject smsData = new JSONObject();
                            smsData.put("body", messageBody.toString());
                            smsData.put("sender", sender);
                            smsData.put("timestamp", System.currentTimeMillis());

                            // Start headless JS task to process the SMS
                            Intent serviceIntent = new Intent(context, SwiftShieldBackgroundTask.class);
                            serviceIntent.putExtra("smsData", smsData.toString());
                            context.startService(serviceIntent);

                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                }
            }
        }
    }
} 