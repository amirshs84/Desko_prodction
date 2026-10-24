package ir.mindtempo.app.notifications;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.annotation.Nullable;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * کلیک دکمه‌هایی که اپ را باز نمی‌کنند (DISMISS / API_CALL) و رد شدن نوتیف (swipe → deleteIntent).
 * دکمه‌های OPEN مستقیم Activity را باز می‌کنند (محدودیت trampoline در Android 12+).
 */
public class NotificationActionReceiver extends BroadcastReceiver {

    public static final String ACTION_DISMISSED = "ir.mindtempo.app.notifications.DISMISSED";
    public static final String ACTION_BUTTON = "ir.mindtempo.app.notifications.BUTTON";

    @Override
    public void onReceive(Context context, Intent intent) {
        PushPayload p = readPayload(intent);
        if (p == null) return;
        String actionId = intent.getStringExtra(NotificationRenderer.EXTRA_ACTION_ID);

        if (ACTION_DISMISSED.equals(intent.getAction())) {
            TrackingQueue.track(context, "DISMISSED", p, null);
            return;
        }
        if (!ACTION_BUTTON.equals(intent.getAction()) || actionId == null) return;

        TrackingQueue.track(context, "ACTION_CLICKED", p, actionId);
        NotificationRenderer.cancel(context, p);
        DeskoNotificationsPlugin.emitAction(p, actionId, false);

        PushPayload.Action action = p.findAction(actionId);
        if (action != null && "API_CALL".equals(action.type) && action.apiPath != null) {
            PendingResult pending = goAsync();
            Context app = context.getApplicationContext();
            new Thread(() -> {
                try {
                    callApi(app, action.apiPath, p);
                } finally {
                    pending.finish();
                }
            }).start();
        }
    }

    @Nullable
    static PushPayload readPayload(Intent intent) {
        String json = intent.getStringExtra(NotificationRenderer.EXTRA_PAYLOAD);
        if (json == null) return null;
        try {
            return PushPayload.fromStored(json);
        } catch (Exception e) {
            return null;
        }
    }

    private static void callApi(Context ctx, String apiPath, PushPayload p) {
        String base = TrackingQueue.apiBase(ctx);
        String token = TrackingQueue.accessToken(ctx);
        if (base == null || token == null) return;
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(base + apiPath).openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            String body = "{\"notification_id\":" + (p.notificationId == null ? "null" : "\"" + p.notificationId + "\"") + "}";
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes("UTF-8"));
            }
            conn.getResponseCode();
        } catch (Exception ignored) {
            // اکشن پس‌زمینه best-effort است
        } finally {
            if (conn != null) conn.disconnect();
        }
    }
}
