package ir.mindtempo.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.webkit.WebStorage;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import ir.mindtempo.app.notifications.DeskoNotificationsPlugin;
import ir.mindtempo.app.plugins.StudyTimerLifecyclePlugin;

public class MainActivity extends BridgeActivity {

    private static final String PREFS_NAME  = "desko_app_prefs";
    private static final String KEY_VERSION = "installed_version";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(StudyTimerLifecyclePlugin.class);
        registerPlugin(DeskoNotificationsPlugin.class);
        super.onCreate(savedInstanceState);

        // فعال‌سازی edge-to-edge — insets به WebView منتقل می‌شود
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // پاک کردن cache وب‌ویو هنگام نصب نسخه جدید APK
        clearWebViewCacheOnUpdate();

        // باز شدن اپ با تپ روی نوتیف (cold start)
        DeskoNotificationsPlugin.handleOpenIntent(this, getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // تپ روی نوتیف وقتی اپ در پس‌زمینه باز است (launchMode=singleTask)
        DeskoNotificationsPlugin.handleOpenIntent(this, intent);
    }

    /**
     * اگر versionCode فعلی با نسخه ذخیره‌شده در SharedPreferences فرق داشت،
     * cache وب‌ویو و storage را پاک می‌کند تا JS/CSS قدیمی ارائه نشود.
     */
    private void clearWebViewCacheOnUpdate() {
        try {
            int currentVersionCode = getPackageManager()
                    .getPackageInfo(getPackageName(), 0)
                    .versionCode;

            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            int savedVersionCode = prefs.getInt(KEY_VERSION, -1);

            if (savedVersionCode != currentVersionCode) {
                // پاک کردن disk cache وب‌ویو
                WebView tempView = new WebView(getApplicationContext());
                tempView.clearCache(true);
                tempView.destroy();

                // پاک کردن Web Storage (localStorage از APK قدیمی)
                WebStorage.getInstance().deleteAllData();

                // ذخیره versionCode جدید
                prefs.edit().putInt(KEY_VERSION, currentVersionCode).apply();
            }
        } catch (Exception e) {
            // در صورت هر خطایی، اپ بدون مشکل ادامه می‌دهد
        }
    }
}
