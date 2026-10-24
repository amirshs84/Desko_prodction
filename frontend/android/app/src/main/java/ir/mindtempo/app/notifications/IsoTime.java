package ir.mindtempo.app.notifications;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/** ISO-8601 بدون java.time (minSdk 24). خروجی‌های isoformat پایتون را هم با میکروثانیه می‌پذیرد. */
final class IsoTime {

    private IsoTime() {}

    static long parseMillis(String iso) throws ParseException {
        String s = iso.trim().replace(" ", "T");
        if (s.endsWith("Z")) s = s.substring(0, s.length() - 1) + "+00:00";
        // کسر ثانیه حذف می‌شود (دقت میلی‌ثانیه‌ای اینجا لازم نیست)
        s = s.replaceFirst("\\.\\d+", "");
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US);
        Date d = f.parse(s);
        if (d == null) throw new ParseException(iso, 0);
        return d.getTime();
    }

    static String now() {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        f.setTimeZone(TimeZone.getTimeZone("UTC"));
        return f.format(new Date());
    }
}
