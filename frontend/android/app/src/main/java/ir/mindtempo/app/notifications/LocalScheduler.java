package ir.mindtempo.app.notifications;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import java.util.Iterator;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * زمان‌بندی نوتیف لوکال با AlarmManager (بدون FCM؛ آفلاین هم کار می‌کند).
 * کلید هر آیتم {@code source_key} است تا sync دوباره‌ی سرور، همان آلارم را جایگزین کند.
 */
public final class LocalScheduler {

    private static final String PREFS = "desko_notif_local";
    static final String EXTRA_SOURCE_KEY = "desko_local_source_key";

    private LocalScheduler() {}

    /** item: آیتم local-schedule سرور یا JS (fire_at به ISO-8601، cancelled اختیاری). */
    public static void apply(Context ctx, JSONObject item, String source) throws Exception {
        String key = item.optString("source_key", "");
        if (key.isEmpty()) throw new IllegalArgumentException("source_key is required");
        if (item.optBoolean("cancelled", false)) {
            cancel(ctx, key);
            return;
        }
        long fireAt = IsoTime.parseMillis(item.getString("fire_at"));
        if (fireAt <= System.currentTimeMillis()) {
            cancel(ctx, key);
            return;
        }
        PushPayload p = PushPayload.fromJson(item, source);
        JSONObject stored = new JSONObject()
            .put("fire_at", fireAt)
            .put("payload", p.toJson());
        prefs(ctx).edit().putString(key, stored.toString()).apply();
        arm(ctx, key, fireAt);
    }

    public static void cancel(Context ctx, String key) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(pendingIntent(ctx, key));
        prefs(ctx).edit().remove(key).apply();
    }

    public static void cancelAll(Context ctx) {
        for (String key : prefs(ctx).getAll().keySet()) cancel(ctx, key);
    }

    public static JSONArray list(Context ctx) {
        JSONArray out = new JSONArray();
        for (String key : prefs(ctx).getAll().keySet()) {
            try {
                JSONObject stored = new JSONObject(prefs(ctx).getString(key, "{}"));
                out.put(new JSONObject().put("source_key", key).put("fire_at", stored.optLong("fire_at")));
            } catch (JSONException ignored) {}
        }
        return out;
    }

    /** بعد از reboot یا آپدیت اپ آلارم‌ها پاک می‌شوند؛ از روی ذخیره دوباره مسلح می‌شوند. */
    public static void rearmAll(Context ctx) {
        long now = System.currentTimeMillis();
        Iterator<String> it = prefs(ctx).getAll().keySet().iterator();
        while (it.hasNext()) {
            String key = it.next();
            try {
                long fireAt = new JSONObject(prefs(ctx).getString(key, "{}")).getLong("fire_at");
                if (fireAt > now) arm(ctx, key, fireAt);
                else prefs(ctx).edit().remove(key).apply();
            } catch (JSONException e) {
                prefs(ctx).edit().remove(key).apply();
            }
        }
    }

    /** آیتم سررسیده را برمی‌دارد (یک‌بار مصرف). */
    static PushPayload take(Context ctx, String key) {
        String raw = prefs(ctx).getString(key, null);
        prefs(ctx).edit().remove(key).apply();
        if (raw == null) return null;
        try {
            return PushPayload.fromStored(new JSONObject(raw).getJSONObject("payload").toString());
        } catch (JSONException e) {
            return null;
        }
    }

    private static void arm(Context ctx, String key, long fireAt) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = pendingIntent(ctx, key);
        boolean exactAllowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms();
        if (exactAllowed) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAt, pi);
        } else {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAt, pi);
        }
    }

    private static PendingIntent pendingIntent(Context ctx, String key) {
        Intent intent = new Intent(ctx, LocalAlarmReceiver.class)
            .setAction("ir.mindtempo.app.notifications.LOCAL_ALARM")
            .setData(android.net.Uri.parse("desko-local://" + key))
            .putExtra(EXTRA_SOURCE_KEY, key);
        return PendingIntent.getBroadcast(
            ctx, key.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
