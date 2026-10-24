package ir.mindtempo.app.notifications;

import androidx.annotation.NonNull;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * جایگزین سرویس پلاگین Capacitor (در Manifest با tools:node="remove" حذف شده).
 * پیلودهای data-only نسخه‌ی ۱ را خودمان رندر می‌کنیم؛ بقیه برای سازگاری به پلاگین می‌رسند.
 */
public class DeskoMessagingService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        super.onMessageReceived(message);
        PushPayload p = PushPayload.fromRemoteData(message.getData());
        if (p == null) {
            PushNotificationsPlugin.sendRemoteMessage(message);
            return;
        }
        if (p.isExpired()) return;

        TrackingQueue.track(this, "DELIVERED", p, null);

        // اپ باز است → UI داخل اپ (toast/in-app) نمایش می‌دهد؛ فقط CRITICAL نوتیف سیستمی هم می‌گیرد.
        boolean handledInApp = DeskoNotificationsPlugin.emitReceived(p);
        if (!handledInApp || p.isCritical()) {
            NotificationRenderer.show(this, p);
        }
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        PushNotificationsPlugin.onNewToken(token);
        DeskoNotificationsPlugin.emitToken(token);
    }
}
