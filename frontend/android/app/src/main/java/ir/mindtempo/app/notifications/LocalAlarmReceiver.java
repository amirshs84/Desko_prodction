package ir.mindtempo.app.notifications;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class LocalAlarmReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String key = intent.getStringExtra(LocalScheduler.EXTRA_SOURCE_KEY);
        if (key == null) return;
        PendingResult pending = goAsync();
        Context app = context.getApplicationContext();
        new Thread(() -> {
            try {
                PushPayload p = LocalScheduler.take(app, key);
                if (p == null) return;
                TrackingQueue.track(app, "DELIVERED", p, null);
                NotificationRenderer.show(app, p);
            } finally {
                pending.finish();
            }
        }).start();
    }
}
