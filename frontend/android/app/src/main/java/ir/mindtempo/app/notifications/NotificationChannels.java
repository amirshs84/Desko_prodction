package ir.mindtempo.app.notifications;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;

/** کانال‌های اندروید به ازای هر سطح اهمیت (هم‌نام با PriorityPolicy.android_channel سرور). */
public final class NotificationChannels {

    public static final String CRITICAL = "desko_critical";
    public static final String HIGH = "desko_high";
    public static final String DEFAULT = "desko_default";
    public static final String LOW = "desko_low";

    private NotificationChannels() {}

    public static String forPriority(String priority) {
        if ("CRITICAL".equals(priority)) return CRITICAL;
        if ("HIGH".equals(priority)) return HIGH;
        if ("LOW".equals(priority)) return LOW;
        return DEFAULT;
    }

    public static void ensure(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;

        NotificationChannel critical = new NotificationChannel(
            CRITICAL, "فوری و حیاتی", NotificationManager.IMPORTANCE_HIGH);
        critical.setDescription("آزمون در حال شروع و اطلاعیه‌های امنیتی");
        critical.enableVibration(true);
        critical.setVibrationPattern(new long[] {0, 400, 200, 400});
        critical.setSound(
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
            new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT).build());

        NotificationChannel high = new NotificationChannel(
            HIGH, "پیام‌ها", NotificationManager.IMPORTANCE_HIGH);
        high.setDescription("پیام‌های مشاور و موارد مهم");

        NotificationChannel normal = new NotificationChannel(
            DEFAULT, "یادآورها و به‌روزرسانی‌ها", NotificationManager.IMPORTANCE_DEFAULT);
        normal.setDescription("برنامه‌ی مطالعاتی و یادآور بلوک‌ها");

        NotificationChannel low = new NotificationChannel(
            LOW, "نکته‌ها و پیشنهادها", NotificationManager.IMPORTANCE_LOW);
        low.setDescription("اطلاعیه‌های غیرفوری، بدون صدا");

        nm.createNotificationChannel(critical);
        nm.createNotificationChannel(high);
        nm.createNotificationChannel(normal);
        nm.createNotificationChannel(low);
    }
}
