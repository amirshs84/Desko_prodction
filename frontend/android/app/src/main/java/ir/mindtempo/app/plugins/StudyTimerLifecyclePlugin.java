package ir.mindtempo.app.plugins;

import android.content.Context;
import android.os.Build;
import android.os.PowerManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * تشخیص تفاوت «خارج شدن واقعی از اپ» (ریسنت / هوم و غیره) با «خواب صفحه با پاور»
 * برای اینکه منطق تایمر بتواند فقط اولی را قطع کند، نه دومی را.
 */
@CapacitorPlugin(name = "StudyTimerLifecycle")
public class StudyTimerLifecyclePlugin extends Plugin {

    static final String EVENT_TIMER_FOCUS_POLICY = "timerFocusPolicy";

    @Override
    public void load() {
        // نیازی به BroadcastReceiver نیست، وضعیت صفحه را مستقیم از PowerManager می‌خوانیم
    }

    private boolean isScreenOff() {
        Context ctx = getContext();
        if (ctx == null) return false;
        PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
        if (pm == null) return false;
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            return !pm.isInteractive();
        } else {
            return !pm.isScreenOn();
        }
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        JSObject data = new JSObject();
        if (isScreenOff()) {
            data.put("kind", "screenSleep");
        } else {
            data.put("kind", "leftApp");
        }
        notifyListeners(EVENT_TIMER_FOCUS_POLICY, data, false);
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        JSObject data = new JSObject();
        data.put("kind", "active");
        notifyListeners(EVENT_TIMER_FOCUS_POLICY, data, false);
    }
}
