package ir.mindtempo.app.notifications;

import android.content.Context;
import android.content.Intent;
import androidx.annotation.Nullable;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.messaging.FirebaseMessaging;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * پل JS ↔ native ماژول نوتیف.
 *
 * رویدادها به JS:
 *   notificationReceived        — push وقتی اپ باز است (برای نمایش داخل اپ)
 *   notificationActionPerformed — تپ روی نوتیف یا دکمه (با retain تا cold start از دست نرود)
 *   tokenReceived               — توکن FCM جدید
 */
@CapacitorPlugin(name = "DeskoNotifications")
public class DeskoNotificationsPlugin extends Plugin {

    private static final String EVENT_RECEIVED = "notificationReceived";
    private static final String EVENT_ACTION = "notificationActionPerformed";
    private static final String EVENT_TOKEN = "tokenReceived";

    @Nullable private static volatile DeskoNotificationsPlugin instance;
    private static volatile boolean foreground = false;
    @Nullable private static JSObject pendingAction;

    @Override
    public void load() {
        instance = this;
        NotificationChannels.ensure(getContext());
        synchronized (DeskoNotificationsPlugin.class) {
            if (pendingAction != null) {
                notifyListeners(EVENT_ACTION, pendingAction, true);
                pendingAction = null;
            }
        }
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        foreground = true;
        TrackingQueue.scheduleFlush(getContext());
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        foreground = false;
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (instance == this) instance = null;
        foreground = false;
    }

    // ---------- فراخوانی از native ----------

    /** @return true اگر اپ باز است و JS گوش می‌دهد (پس UI داخل اپ نمایش می‌دهد). */
    static boolean emitReceived(PushPayload p) {
        DeskoNotificationsPlugin plugin = instance;
        if (plugin == null || !foreground || !plugin.hasListeners(EVENT_RECEIVED)) return false;
        plugin.notifyListeners(EVENT_RECEIVED, toJs(p.toJson()), false);
        return true;
    }

    static void emitToken(String token) {
        DeskoNotificationsPlugin plugin = instance;
        if (plugin == null) return;
        JSObject data = new JSObject();
        data.put("token", token);
        plugin.notifyListeners(EVENT_TOKEN, data, true);
    }

    static void emitAction(PushPayload p, @Nullable String actionId, boolean opened) {
        JSObject data = new JSObject();
        data.put("actionId", actionId);
        data.put("opened", opened);
        data.put("notification", toJs(p.toJson()));
        PushPayload.Action action = actionId != null ? p.findAction(actionId) : null;
        data.put("deeplink", action != null && action.deeplink != null ? action.deeplink : p.deeplink);
        DeskoNotificationsPlugin plugin = instance;
        if (plugin == null) {
            if (opened) {
                synchronized (DeskoNotificationsPlugin.class) {
                    pendingAction = data;
                }
            }
            return;
        }
        plugin.notifyListeners(EVENT_ACTION, data, true);
    }

    /** از MainActivity (onCreate/onNewIntent) برای Intent های باز شدن از نوتیف. */
    public static void handleOpenIntent(Context ctx, @Nullable Intent intent) {
        if (intent == null || !NotificationRenderer.ACTION_OPEN.equals(intent.getAction())) return;
        PushPayload p = NotificationActionReceiver.readPayload(intent);
        if (p == null) return;
        String actionId = intent.getStringExtra(NotificationRenderer.EXTRA_ACTION_ID);
        // یک Intent نباید با چرخش صفحه/recreate دوبار ثبت شود
        intent.setAction(Intent.ACTION_MAIN);
        NotificationRenderer.cancel(ctx, p);
        TrackingQueue.track(ctx, actionId == null ? "OPENED" : "ACTION_CLICKED", p, actionId);
        emitAction(p, actionId, true);
    }

    // ---------- متدهای JS ----------

    @PluginMethod
    public void ensureChannels(PluginCall call) {
        NotificationChannels.ensure(getContext());
        call.resolve();
    }

    @PluginMethod
    public void getToken(PluginCall call) {
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (!task.isSuccessful() || task.getResult() == null) {
                call.reject("FCM token unavailable", task.getException());
                return;
            }
            JSObject ret = new JSObject();
            ret.put("token", task.getResult());
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void setTrackingCredentials(PluginCall call) {
        String apiBase = call.getString("apiBase");
        String deviceId = call.getString("deviceId");
        String secret = call.getString("deviceSecret");
        if (apiBase == null || deviceId == null || secret == null) {
            call.reject("apiBase, deviceId and deviceSecret are required");
            return;
        }
        if (!apiBase.endsWith("/")) apiBase = apiBase + "/";
        TrackingQueue.setCredentials(getContext(), apiBase, deviceId, secret, call.getString("accessToken"));
        call.resolve();
    }

    @PluginMethod
    public void clearTrackingCredentials(PluginCall call) {
        TrackingQueue.clearCredentials(getContext());
        LocalScheduler.cancelAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void scheduleLocal(PluginCall call) {
        JSArray items = call.getArray("items");
        if (items == null) {
            call.reject("items is required");
            return;
        }
        int applied = 0;
        JSONArray errors = new JSONArray();
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null) continue;
            try {
                LocalScheduler.apply(getContext(), item, item.optString("source", PushPayload.SOURCE_LOCAL_SCHEDULED));
                applied++;
            } catch (Exception e) {
                errors.put(item.optString("source_key") + ": " + e.getMessage());
            }
        }
        JSObject ret = new JSObject();
        ret.put("applied", applied);
        ret.put("errors", errors);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelLocal(PluginCall call) {
        JSArray keys = call.getArray("sourceKeys");
        if (keys != null) {
            for (int i = 0; i < keys.length(); i++) LocalScheduler.cancel(getContext(), keys.optString(i));
        }
        call.resolve();
    }

    @PluginMethod
    public void cancelAllLocal(PluginCall call) {
        LocalScheduler.cancelAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void listLocal(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("items", LocalScheduler.list(getContext()));
        call.resolve(ret);
    }

    /** نوتیف فوری ساخته‌شده در خود اپ (مثلا پایان تایمر مطالعه). */
    @PluginMethod
    public void showNow(PluginCall call) {
        JSObject notification = call.getObject("notification");
        if (notification == null || notification.optString("title").isEmpty()) {
            call.reject("notification.title is required");
            return;
        }
        PushPayload p = PushPayload.fromJson(notification, PushPayload.SOURCE_LOCAL_CLIENT);
        JSObject ret = new JSObject();
        ret.put("shown", NotificationRenderer.show(getContext(), p));
        call.resolve(ret);
    }

    @PluginMethod
    public void flushTracking(PluginCall call) {
        TrackingQueue.scheduleFlush(getContext());
        call.resolve();
    }

    private static JSObject toJs(JSONObject o) {
        try {
            return JSObject.fromJSONObject(o);
        } catch (Exception e) {
            return new JSObject();
        }
    }
}
