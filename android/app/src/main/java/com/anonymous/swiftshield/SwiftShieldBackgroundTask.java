package com.anonymous.swiftshield;

import android.content.Intent;
import android.os.Bundle;
import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;
import javax.annotation.Nullable;

public class SwiftShieldBackgroundTask extends HeadlessJsTaskService {
    @Override
    protected @Nullable HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        Bundle extras = intent.getExtras();
        if (extras != null) {
            String smsData = extras.getString("smsData", "{}");
            return new HeadlessJsTaskConfig(
                "SwiftShieldBackgroundTask",
                Arguments.createMap(),
                5000, // Timeout in milliseconds
                true // Optional task
            );
        }
        return null;
    }
} 