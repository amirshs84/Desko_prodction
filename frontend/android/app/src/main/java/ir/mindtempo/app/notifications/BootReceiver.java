package ir.mindtempo.app.notifications;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** آلارم‌ها با reboot و آپدیت اپ حذف می‌شوند؛ اینجا دوباره مسلح می‌شوند. */
public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
            || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            LocalScheduler.rearmAll(context);
            TrackingQueue.scheduleFlush(context);
        }
    }
}
