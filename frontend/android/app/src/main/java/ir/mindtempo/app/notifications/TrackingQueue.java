package ir.mindtempo.app.notifications;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.Nullable;
import androidx.work.BackoffPolicy;
import androidx.work.Constraints;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * صف ماندگار رویدادهای نوتیف (رسید، نمایش، کلیک، رد شدن) روی دستگاه.
 * حتی وقتی اپ بسته است ثبت می‌شود و WorkManager با اولین اینترنت به
 * {@code /api/notify/events/batch/} می‌فرستد. هر رویداد UUID دارد → ارسال دوباره بی‌خطر است.
 */
public final class TrackingQueue {

    static final String PREFS = "desko_notif_tracking";
    private static final String KEY_EVENTS = "events";
    private static final String KEY_API_BASE = "api_base";
    private static final String KEY_DEVICE_ID = "device_id";
    private static final String KEY_DEVICE_SECRET = "device_secret";
    private static final String KEY_ACCESS_TOKEN = "access_token";
    private static final int MAX_EVENTS = 500;
    private static final String WORK_NAME = "desko_notif_tracking_flush";

    private TrackingQueue() {}

    public static void setCredentials(
        Context ctx, String apiBase, String deviceId, String deviceSecret, @Nullable String accessToken) {
        SharedPreferences.Editor e = prefs(ctx).edit()
            .putString(KEY_API_BASE, apiBase)
            .putString(KEY_DEVICE_ID, deviceId)
            .putString(KEY_DEVICE_SECRET, deviceSecret);
        if (accessToken != null) e.putString(KEY_ACCESS_TOKEN, accessToken);
        e.apply();
        scheduleFlush(ctx);
    }

    public static void clearCredentials(Context ctx) {
        prefs(ctx).edit()
            .remove(KEY_DEVICE_ID)
            .remove(KEY_DEVICE_SECRET)
            .remove(KEY_ACCESS_TOKEN)
            .apply();
    }

    public static void track(Context ctx, String type, PushPayload p, @Nullable String actionId) {
        try {
            JSONObject e = new JSONObject();
            e.put("id", UUID.randomUUID().toString());
            e.put("type", type);
            e.put("occurred_at", IsoTime.now());
            if (p.notificationId != null) e.put("notification_id", p.notificationId);
            if (p.localSourceKey != null) e.put("local_source_key", p.localSourceKey);
            e.put("category", p.category);
            if (actionId != null) e.put("action_id", actionId);
            JSONObject meta = new JSONObject();
            meta.put("source", p.source);
            meta.put("platform", "ANDROID");
            e.put("metadata", meta);
            append(ctx, e);
        } catch (JSONException ignored) {}
        scheduleFlush(ctx);
    }

    static synchronized void append(Context ctx, JSONObject event) {
        JSONArray arr = read(ctx);
        arr.put(event);
        // قدیمی‌ترها دور ریخته می‌شوند تا حافظه‌ی دستگاه بی‌حد رشد نکند
        while (arr.length() > MAX_EVENTS) arr.remove(0);
        prefs(ctx).edit().putString(KEY_EVENTS, arr.toString()).apply();
    }

    static synchronized JSONArray peek(Context ctx, int max) {
        JSONArray all = read(ctx);
        JSONArray out = new JSONArray();
        for (int i = 0; i < Math.min(max, all.length()); i++) out.put(all.opt(i));
        return out;
    }

    static synchronized void removeFirst(Context ctx, int count) {
        JSONArray all = read(ctx);
        JSONArray rest = new JSONArray();
        for (int i = count; i < all.length(); i++) rest.put(all.opt(i));
        prefs(ctx).edit().putString(KEY_EVENTS, rest.toString()).apply();
    }

    static int size(Context ctx) {
        return read(ctx).length();
    }

    @Nullable static String apiBase(Context ctx) { return prefs(ctx).getString(KEY_API_BASE, null); }
    @Nullable static String deviceId(Context ctx) { return prefs(ctx).getString(KEY_DEVICE_ID, null); }
    @Nullable static String deviceSecret(Context ctx) { return prefs(ctx).getString(KEY_DEVICE_SECRET, null); }
    @Nullable static String accessToken(Context ctx) { return prefs(ctx).getString(KEY_ACCESS_TOKEN, null); }

    public static void scheduleFlush(Context ctx) {
        OneTimeWorkRequest req = new OneTimeWorkRequest.Builder(TrackingFlushWorker.class)
            .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setInitialDelay(5, TimeUnit.SECONDS)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build();
        WorkManager.getInstance(ctx).enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.KEEP, req);
    }

    private static JSONArray read(Context ctx) {
        try {
            return new JSONArray(prefs(ctx).getString(KEY_EVENTS, "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
