package site.myosapp.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Everything the alarm and the blocker need to remember, kept on the phone.
 * It lives in plain storage so it still works when the MYOS screen is closed.
 */
public final class DisciplineStore {
    private static final String PREFS = "myos_discipline";
    private static final String KEY_BLOCKED = "blocked";
    private static final String KEY_LOCKED = "locked";
    private static final String KEY_ACTIVE = "active_alarm";
    private static final String KEY_ACTIVE_TASK = "active_task";
    private static final String KEY_ACTIVE_APPKEY = "active_app_key";
    private static final String KEY_TASK_APPS = "task_apps";
    private static final String KEY_ALARMS = "alarms";

    public static final String TEST_ID = "__test__";

    private DisciplineStore() {}

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    // ---- Blocked apps ----

    public static Set<String> getBlocked(Context ctx) {
        return new HashSet<>(prefs(ctx).getStringSet(KEY_BLOCKED, new HashSet<String>()));
    }

    public static void setBlocked(Context ctx, Set<String> ids) {
        prefs(ctx).edit().putStringSet(KEY_BLOCKED, new HashSet<>(ids)).apply();
    }

    // ---- Lock state ----

    public static boolean isLocked(Context ctx) {
        return prefs(ctx).getBoolean(KEY_LOCKED, false);
    }

    public static void setLocked(Context ctx, boolean locked) {
        prefs(ctx).edit().putBoolean(KEY_LOCKED, locked).apply();
    }

    public static String getActiveAlarm(Context ctx) {
        return prefs(ctx).getString(KEY_ACTIVE, "");
    }

    public static void setActiveAlarm(Context ctx, String id) {
        prefs(ctx).edit().putString(KEY_ACTIVE, id == null ? "" : id).apply();
    }

    public static String getActiveTask(Context ctx) {
        return prefs(ctx).getString(KEY_ACTIVE_TASK, "");
    }

    public static void setActiveTask(Context ctx, String taskId) {
        prefs(ctx).edit().putString(KEY_ACTIVE_TASK, taskId == null ? "" : taskId).apply();
    }

    public static String getActiveAppKey(Context ctx) {
        return prefs(ctx).getString(KEY_ACTIVE_APPKEY, "");
    }

    public static void setActiveAppKey(Context ctx, String key) {
        prefs(ctx).edit().putString(KEY_ACTIVE_APPKEY, key == null ? "" : key).apply();
    }

    // ---- Which app a task uses (saved on this phone only) ----

    public static JSONObject getTaskApps(Context ctx) {
        try {
            return new JSONObject(prefs(ctx).getString(KEY_TASK_APPS, "{}"));
        } catch (JSONException e) {
            return new JSONObject();
        }
    }

    public static void setTaskApp(Context ctx, String key, String appId) {
        JSONObject all = getTaskApps(ctx);
        try {
            if (appId == null || appId.isEmpty()) all.remove(key);
            else all.put(key, appId);
        } catch (JSONException ignored) {
        }
        prefs(ctx).edit().putString(KEY_TASK_APPS, all.toString()).apply();
    }

    /** The app the waiting task uses, or empty when it has none. */
    public static String getActiveTaskApp(Context ctx) {
        String key = getActiveAppKey(ctx);
        if (key.isEmpty()) return "";
        return getTaskApps(ctx).optString(key, "");
    }

    // ---- Alarms ----

    public static JSONArray getAlarms(Context ctx) {
        try {
            return new JSONArray(prefs(ctx).getString(KEY_ALARMS, "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    private static void saveAlarms(Context ctx, JSONArray alarms) {
        prefs(ctx).edit().putString(KEY_ALARMS, alarms.toString()).apply();
    }

    public static JSONObject getAlarm(Context ctx, String id) {
        JSONArray all = getAlarms(ctx);
        for (int i = 0; i < all.length(); i++) {
            JSONObject a = all.optJSONObject(i);
            if (a != null && id.equals(a.optString("id"))) return a;
        }
        return null;
    }

    /** Adds the alarm, or replaces the one with the same id. */
    public static void putAlarm(Context ctx, JSONObject alarm) {
        JSONArray all = getAlarms(ctx);
        JSONArray next = new JSONArray();
        String id = alarm.optString("id");
        for (int i = 0; i < all.length(); i++) {
            JSONObject a = all.optJSONObject(i);
            if (a != null && !id.equals(a.optString("id"))) next.put(a);
        }
        next.put(alarm);
        saveAlarms(ctx, next);
    }

    public static void removeAlarm(Context ctx, String id) {
        JSONArray all = getAlarms(ctx);
        JSONArray next = new JSONArray();
        for (int i = 0; i < all.length(); i++) {
            JSONObject a = all.optJSONObject(i);
            if (a != null && !id.equals(a.optString("id"))) next.put(a);
        }
        saveAlarms(ctx, next);
        cancel(ctx, id);
    }

    public static String todayText() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    // ---- Scheduling ----

    /** The next time the clock shows hour:minute, after the given moment. */
    public static long nextTime(int hour, int minute, long after) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(after);
        c.set(Calendar.HOUR_OF_DAY, hour);
        c.set(Calendar.MINUTE, minute);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        if (c.getTimeInMillis() <= after) c.add(Calendar.DAY_OF_MONTH, 1);
        return c.getTimeInMillis();
    }

    private static PendingIntent receiverIntent(Context ctx, String id, String label) {
        Intent i = new Intent(ctx, AlarmReceiver.class);
        i.putExtra("id", id);
        i.putExtra("label", label);
        return PendingIntent.getBroadcast(
            ctx, id.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Sets one exact alarm. It shows up as a normal alarm clock, so the phone never delays it. */
    public static void scheduleAt(Context ctx, String id, String label, long millis) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent show = new Intent(ctx, MainActivity.class);
        PendingIntent showPi = PendingIntent.getActivity(
            ctx, 0, show, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.setAlarmClock(new AlarmManager.AlarmClockInfo(millis, showPi), receiverIntent(ctx, id, label));
    }

    /** Sets the next ring for a saved alarm. Returns when it will ring. */
    public static long schedule(Context ctx, JSONObject alarm) {
        long at = nextTime(alarm.optInt("hour"), alarm.optInt("minute"), System.currentTimeMillis());
        scheduleAt(ctx, alarm.optString("id"), alarm.optString("label"), at);
        return at;
    }

    public static void cancel(Context ctx, String id) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        am.cancel(receiverIntent(ctx, id, ""));
    }

    /** After a restart the phone forgets alarms. This sets them all again. */
    public static void rescheduleAll(Context ctx) {
        JSONArray all = getAlarms(ctx);
        for (int i = 0; i < all.length(); i++) {
            JSONObject a = all.optJSONObject(i);
            if (a != null) schedule(ctx, a);
        }
    }
}
