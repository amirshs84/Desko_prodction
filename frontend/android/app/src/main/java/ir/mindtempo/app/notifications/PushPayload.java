package ir.mindtempo.app.notifications;

import androidx.annotation.Nullable;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * مدل مشترک نوتیف برای push سرور (data-only v1) و نوتیف‌های لوکال.
 * قرارداد: notifications/contracts/push_payload_v1.schema.json
 */
public final class PushPayload {

    public static final String SOURCE_SERVER = "SERVER";
    public static final String SOURCE_LOCAL_SCHEDULED = "LOCAL_SCHEDULED";
    public static final String SOURCE_LOCAL_CLIENT = "LOCAL_CLIENT";

    public static final class Action {
        public final String id;
        public final String title;
        public final String type; // OPEN | DISMISS | API_CALL
        @Nullable public final String deeplink;
        @Nullable public final String apiPath;

        Action(String id, String title, String type, @Nullable String deeplink, @Nullable String apiPath) {
            this.id = id;
            this.title = title;
            this.type = type;
            this.deeplink = deeplink;
            this.apiPath = apiPath;
        }

        JSONObject toJson() throws JSONException {
            JSONObject o = new JSONObject();
            o.put("id", id).put("title", title).put("type", type);
            if (deeplink != null) o.put("deeplink", deeplink);
            if (apiPath != null) o.put("api_path", apiPath);
            return o;
        }
    }

    public String source = SOURCE_SERVER;
    @Nullable public String notificationId;
    @Nullable public String localSourceKey;
    public String category = "";
    public String priority = "NORMAL";
    public String channelId = NotificationChannels.DEFAULT;
    public String title = "";
    public String body = "";
    public String style = "BASIC";
    @Nullable public String deeplink;
    @Nullable public String collapseKey;
    @Nullable public String expiresAt;
    @Nullable public String imageUrl;
    @Nullable public String largeIconUrl;
    @Nullable public String lottieUrl;
    @Nullable public String inApp;
    public List<Action> actions = Collections.emptyList();
    public List<String> lines = Collections.emptyList();
    public int progress = -1;

    private PushPayload() {}

    /** پیلود FCM data-only؛ اگر نسخه‌ی قرارداد شناخته‌شده نباشد null. */
    @Nullable
    public static PushPayload fromRemoteData(Map<String, String> data) {
        if (data == null || !"1".equals(data.get("v")) || data.get("title") == null) return null;
        PushPayload p = new PushPayload();
        p.source = SOURCE_SERVER;
        p.notificationId = data.get("nid");
        p.category = orEmpty(data.get("category"));
        p.priority = orDefault(data.get("priority"), "NORMAL");
        p.channelId = orDefault(data.get("channel_id"), NotificationChannels.forPriority(p.priority));
        p.title = data.get("title");
        p.body = orEmpty(data.get("body"));
        p.style = orDefault(data.get("style"), "BASIC");
        p.deeplink = blankToNull(data.get("deeplink"));
        p.collapseKey = blankToNull(data.get("collapse_key"));
        p.expiresAt = blankToNull(data.get("expires_at"));
        p.inApp = blankToNull(data.get("in_app"));
        try {
            if (data.get("media") != null) p.readMedia(new JSONObject(data.get("media")));
            if (data.get("actions") != null) p.actions = parseActions(new JSONArray(data.get("actions")));
            if (data.get("lines") != null) p.lines = parseLines(new JSONArray(data.get("lines")));
        } catch (JSONException ignored) {
            // فیلدهای غنی خراب نباید کل نوتیف را از بین ببرند
        }
        if (data.get("progress") != null) {
            try {
                p.progress = Integer.parseInt(data.get("progress"));
            } catch (NumberFormatException ignored) {}
        }
        return p;
    }

    /** آیتم local-schedule سرور یا نوتیف ساخته‌شده در JS (فیلدهای JSON تودرتو، نه رشته). */
    public static PushPayload fromJson(JSONObject o, String source) {
        PushPayload p = new PushPayload();
        p.source = source;
        p.notificationId = null;
        p.localSourceKey = blankToNull(o.optString("source_key", o.optString("id", "")));
        p.category = o.optString("category", "");
        p.priority = o.optString("priority", "NORMAL");
        p.channelId = o.optString("channel_id", NotificationChannels.forPriority(p.priority));
        p.title = o.optString("title", "");
        p.body = o.optString("body", "");
        p.style = o.optString("style", "BASIC");
        p.deeplink = blankToNull(o.optString("deeplink", ""));
        p.collapseKey = blankToNull(o.optString("collapse_key", ""));
        JSONObject media = o.optJSONObject("media");
        if (media != null) p.readMedia(media);
        JSONArray actions = o.optJSONArray("actions");
        if (actions != null) p.actions = parseActions(actions);
        JSONArray lines = o.optJSONArray("lines");
        if (lines != null) p.lines = parseLines(lines);
        p.progress = o.optInt("progress", -1);
        JSONObject inApp = o.optJSONObject("in_app");
        if (inApp != null) p.inApp = inApp.toString();
        return p;
    }

    public boolean isExpired() {
        if (expiresAt == null) return false;
        try {
            return IsoTime.parseMillis(expiresAt) < System.currentTimeMillis();
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isCritical() {
        return "CRITICAL".equals(priority);
    }

    /** شناسه‌ی پایدار برای NotificationManager (collapse_key جایگزین نوتیف قبلی می‌شود). */
    public String tag() {
        if (collapseKey != null) return "c:" + collapseKey;
        if (notificationId != null) return "n:" + notificationId;
        return "l:" + (localSourceKey != null ? localSourceKey : title);
    }

    @Nullable
    public Action findAction(String id) {
        for (Action a : actions) if (a.id.equals(id)) return a;
        return null;
    }

    public JSONObject toJson() {
        JSONObject o = new JSONObject();
        try {
            o.put("source", source);
            o.put("notification_id", notificationId);
            o.put("local_source_key", localSourceKey);
            o.put("category", category);
            o.put("priority", priority);
            o.put("channel_id", channelId);
            o.put("title", title);
            o.put("body", body);
            o.put("style", style);
            o.put("deeplink", deeplink);
            o.put("collapse_key", collapseKey);
            o.put("expires_at", expiresAt);
            JSONObject media = new JSONObject();
            if (imageUrl != null) media.put("image_url", imageUrl);
            if (largeIconUrl != null) media.put("large_icon_url", largeIconUrl);
            if (lottieUrl != null) media.put("lottie_url", lottieUrl);
            o.put("media", media);
            JSONArray acts = new JSONArray();
            for (Action a : actions) acts.put(a.toJson());
            o.put("actions", acts);
            o.put("lines", new JSONArray(lines));
            if (progress >= 0) o.put("progress", progress);
            if (inApp != null) o.put("in_app", new JSONObject(inApp));
        } catch (JSONException ignored) {}
        return o;
    }

    public static PushPayload fromStored(String json) throws JSONException {
        JSONObject o = new JSONObject(json);
        PushPayload p = fromJson(o, o.optString("source", SOURCE_SERVER));
        p.notificationId = blankToNull(o.optString("notification_id", ""));
        p.localSourceKey = blankToNull(o.optString("local_source_key", ""));
        p.expiresAt = blankToNull(o.optString("expires_at", ""));
        return p;
    }

    private void readMedia(JSONObject media) {
        imageUrl = blankToNull(media.optString("image_url", ""));
        largeIconUrl = blankToNull(media.optString("large_icon_url", ""));
        lottieUrl = blankToNull(media.optString("lottie_url", ""));
    }

    private static List<Action> parseActions(JSONArray arr) {
        List<Action> out = new ArrayList<>();
        for (int i = 0; i < arr.length() && out.size() < 3; i++) {
            JSONObject a = arr.optJSONObject(i);
            if (a == null || a.optString("id").isEmpty()) continue;
            out.add(new Action(
                a.optString("id"),
                a.optString("title"),
                a.optString("type", "OPEN"),
                blankToNull(a.optString("deeplink", "")),
                blankToNull(a.optString("api_path", ""))
            ));
        }
        return out;
    }

    private static List<String> parseLines(JSONArray arr) {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < arr.length(); i++) out.add(arr.optString(i));
        return out;
    }

    private static String orEmpty(@Nullable String s) {
        return s == null ? "" : s;
    }

    private static String orDefault(@Nullable String s, String def) {
        return s == null || s.isEmpty() ? def : s;
    }

    @Nullable
    private static String blankToNull(@Nullable String s) {
        return s == null || s.isEmpty() || "null".equals(s) ? null : s;
    }
}
