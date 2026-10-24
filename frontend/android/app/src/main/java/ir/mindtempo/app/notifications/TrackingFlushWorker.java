package ir.mindtempo.app.notifications;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import org.json.JSONArray;
import org.json.JSONObject;

/** ارسال دسته‌ای رویدادها با secret دستگاه (بدون JWT). */
public class TrackingFlushWorker extends Worker {

    private static final int BATCH = 100;

    public TrackingFlushWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        String base = TrackingQueue.apiBase(ctx);
        String deviceId = TrackingQueue.deviceId(ctx);
        String secret = TrackingQueue.deviceSecret(ctx);
        if (base == null || deviceId == null || secret == null) {
            // هنوز دستگاه ثبت نشده؛ رویدادها می‌مانند تا JS اعتبارنامه را بدهد
            return Result.success();
        }
        try {
            while (TrackingQueue.size(ctx) > 0) {
                JSONArray batch = TrackingQueue.peek(ctx, BATCH);
                int code = post(base + "notify/events/batch/", deviceId, secret, batch);
                if (code >= 200 && code < 300) {
                    TrackingQueue.removeFirst(ctx, batch.length());
                } else if (code == 400) {
                    // batch خراب است؛ دور ریخته می‌شود تا صف قفل نشود
                    TrackingQueue.removeFirst(ctx, batch.length());
                } else if (code == 401 || code == 403) {
                    return Result.success();
                } else {
                    return Result.retry();
                }
            }
            return Result.success();
        } catch (Exception e) {
            return Result.retry();
        }
    }

    private static int post(String url, String deviceId, String secret, JSONArray events) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        try {
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            conn.setRequestProperty("X-Device-Id", deviceId);
            conn.setRequestProperty("X-Device-Secret", secret);
            byte[] body = new JSONObject().put("events", events).toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body);
            }
            return conn.getResponseCode();
        } finally {
            conn.disconnect();
        }
    }
}
