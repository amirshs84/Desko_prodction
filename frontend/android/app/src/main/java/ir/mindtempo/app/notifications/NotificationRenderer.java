package ir.mindtempo.app.notifications;

import android.Manifest;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import androidx.annotation.Nullable;
import androidx.annotation.WorkerThread;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import ir.mindtempo.app.MainActivity;
import ir.mindtempo.app.R;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * ساخت و نمایش نوتیف سیستمی از {@link PushPayload} — مشترک برای push و لوکال.
 * باید روی thread پس‌زمینه صدا زده شود (دانلود تصویر).
 */
public final class NotificationRenderer {

    public static final String ACTION_OPEN = "ir.mindtempo.app.notifications.OPEN";
    public static final String EXTRA_PAYLOAD = "desko_notification_payload";
    public static final String EXTRA_ACTION_ID = "desko_notification_action_id";

    private static final int IMAGE_TIMEOUT_MS = 6000;
    private static final int MAX_IMAGE_PX = 1024;
    private static final int ACCENT = 0xFF4F46E5;

    private NotificationRenderer() {}

    /** @return true اگر نوتیف واقعاً نمایش داده شد. */
    @WorkerThread
    public static boolean show(Context ctx, PushPayload p) {
        NotificationChannels.ensure(ctx);
        NotificationManagerCompat nm = NotificationManagerCompat.from(ctx);
        if (!nm.areNotificationsEnabled() || !hasPostPermission(ctx)) return false;

        String tag = p.tag();
        int baseCode = tag.hashCode();
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, p.channelId)
            .setSmallIcon(R.drawable.ic_stat_desko)
            .setColor(ACCENT)
            .setContentTitle(p.title)
            .setContentText(p.body)
            .setAutoCancel(true)
            .setGroup("desko:" + p.category)
            .setPriority(compatPriority(p.priority))
            .setCategory(p.isCritical() ? NotificationCompat.CATEGORY_ALARM : NotificationCompat.CATEGORY_MESSAGE)
            .setContentIntent(openIntent(ctx, p, null, baseCode))
            .setDeleteIntent(broadcast(ctx, NotificationActionReceiver.ACTION_DISMISSED, p, null, baseCode + 1));

        Bitmap largeIcon = download(p.largeIconUrl);
        if (largeIcon != null) b.setLargeIcon(largeIcon);
        applyStyle(b, p);

        int i = 0;
        for (PushPayload.Action a : p.actions) {
            PendingIntent pi = "OPEN".equals(a.type)
                ? openIntent(ctx, p, a.id, baseCode + 10 + i)
                : broadcast(ctx, NotificationActionReceiver.ACTION_BUTTON, p, a.id, baseCode + 10 + i);
            b.addAction(0, a.title, pi);
            i++;
        }

        try {
            nm.notify(tag, 0, b.build());
        } catch (SecurityException e) {
            return false;
        }
        TrackingQueue.track(ctx, "DISPLAYED", p, null);
        return true;
    }

    public static void cancel(Context ctx, PushPayload p) {
        NotificationManagerCompat.from(ctx).cancel(p.tag(), 0);
    }

    private static void applyStyle(NotificationCompat.Builder b, PushPayload p) {
        switch (p.style) {
            case "BIG_PICTURE": {
                Bitmap picture = download(p.imageUrl);
                if (picture != null) {
                    b.setStyle(new NotificationCompat.BigPictureStyle()
                        .bigPicture(picture)
                        .setSummaryText(p.body));
                    return;
                }
                b.setStyle(new NotificationCompat.BigTextStyle().bigText(p.body));
                return;
            }
            case "INBOX": {
                NotificationCompat.InboxStyle s = new NotificationCompat.InboxStyle();
                for (String line : p.lines) s.addLine(line);
                b.setStyle(s);
                return;
            }
            case "PROGRESS":
                if (p.progress >= 0) b.setProgress(100, p.progress, false).setOnlyAlertOnce(true);
                return;
            case "BIG_TEXT":
                b.setStyle(new NotificationCompat.BigTextStyle().bigText(p.body));
                return;
            default:
                if (p.body.length() > 40) b.setStyle(new NotificationCompat.BigTextStyle().bigText(p.body));
        }
    }

    private static PendingIntent openIntent(Context ctx, PushPayload p, @Nullable String actionId, int requestCode) {
        Intent intent = new Intent(ctx, MainActivity.class)
            .setAction(ACTION_OPEN)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .putExtra(EXTRA_PAYLOAD, p.toJson().toString());
        if (actionId != null) intent.putExtra(EXTRA_ACTION_ID, actionId);
        return PendingIntent.getActivity(ctx, requestCode, intent, flags());
    }

    private static PendingIntent broadcast(
        Context ctx, String action, PushPayload p, @Nullable String actionId, int requestCode) {
        Intent intent = new Intent(ctx, NotificationActionReceiver.class)
            .setAction(action)
            .putExtra(EXTRA_PAYLOAD, p.toJson().toString());
        if (actionId != null) intent.putExtra(EXTRA_ACTION_ID, actionId);
        return PendingIntent.getBroadcast(ctx, requestCode, intent, flags());
    }

    private static int flags() {
        return PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
    }

    private static int compatPriority(String priority) {
        switch (priority) {
            case "CRITICAL": return NotificationCompat.PRIORITY_MAX;
            case "HIGH": return NotificationCompat.PRIORITY_HIGH;
            case "LOW": return NotificationCompat.PRIORITY_LOW;
            default: return NotificationCompat.PRIORITY_DEFAULT;
        }
    }

    private static boolean hasPostPermission(Context ctx) {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
            || ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;
    }

    @Nullable
    private static Bitmap download(@Nullable String url) {
        if (url == null || !url.startsWith("http")) return null;
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setConnectTimeout(IMAGE_TIMEOUT_MS);
            conn.setReadTimeout(IMAGE_TIMEOUT_MS);
            try (InputStream in = conn.getInputStream()) {
                Bitmap bmp = BitmapFactory.decodeStream(in);
                if (bmp == null) return null;
                int max = Math.max(bmp.getWidth(), bmp.getHeight());
                if (max <= MAX_IMAGE_PX) return bmp;
                float scale = (float) MAX_IMAGE_PX / max;
                return Bitmap.createScaledBitmap(
                    bmp, Math.round(bmp.getWidth() * scale), Math.round(bmp.getHeight() * scale), true);
            }
        } catch (Exception e) {
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }
}
