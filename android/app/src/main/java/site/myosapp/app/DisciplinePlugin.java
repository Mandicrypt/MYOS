package site.myosapp.app;

import android.Manifest;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Base64;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** The bridge between the MYOS screens and the phone: alarms, the app list, and the blocker. */
@CapacitorPlugin(name = "Discipline")
public class DisciplinePlugin extends Plugin {

    // ---- Apps ----

    @PluginMethod
    public void getApps(final PluginCall call) {
        new Thread(
            new Runnable() {
                @Override
                public void run() {
                    try {
                        Context ctx = getContext();
                        PackageManager pm = ctx.getPackageManager();
                        Intent launcher = new Intent(Intent.ACTION_MAIN);
                        launcher.addCategory(Intent.CATEGORY_LAUNCHER);
                        List<ResolveInfo> found = pm.queryIntentActivities(launcher, 0);

                        final List<JSObject> apps = new ArrayList<>();
                        Set<String> seen = new HashSet<>();
                        for (ResolveInfo info : found) {
                            String pkg = info.activityInfo.packageName;
                            if (pkg.equals(ctx.getPackageName()) || !seen.add(pkg)) continue;
                            JSObject app = new JSObject();
                            app.put("id", pkg);
                            app.put("name", String.valueOf(info.loadLabel(pm)));
                            app.put("icon", iconToBase64(info.loadIcon(pm)));
                            apps.add(app);
                        }
                        Collections.sort(apps, new Comparator<JSObject>() {
                            @Override
                            public int compare(JSObject a, JSObject b) {
                                return a.getString("name", "").compareToIgnoreCase(b.getString("name", ""));
                            }
                        });

                        JSArray list = new JSArray();
                        for (JSObject app : apps) list.put(app);
                        JSObject result = new JSObject();
                        result.put("apps", list);
                        call.resolve(result);
                    } catch (Exception e) {
                        call.reject("Could not read the apps on this phone");
                    }
                }
            })
            .start();
    }

    private static String iconToBase64(Drawable drawable) {
        try {
            int size = 56;
            Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            drawable.setBounds(0, 0, size, size);
            drawable.draw(canvas);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 90, out);
            return "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) {
            return "";
        }
    }

    @PluginMethod
    public void getBlocked(PluginCall call) {
        JSArray ids = new JSArray();
        for (String id : DisciplineStore.getBlocked(getContext())) ids.put(id);
        JSObject result = new JSObject();
        result.put("ids", ids);
        call.resolve(result);
    }

    @PluginMethod
    public void setBlocked(PluginCall call) {
        JSArray ids = call.getArray("ids");
        Set<String> set = new HashSet<>();
        if (ids != null) {
            for (int i = 0; i < ids.length(); i++) {
                String id = ids.optString(i);
                if (id != null && !id.isEmpty()) set.add(id);
            }
        }
        DisciplineStore.setBlocked(getContext(), set);
        call.resolve();
    }

    // ---- Task and app links ----

    @PluginMethod
    public void setTaskApp(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.isEmpty()) {
            call.reject("Missing task key");
            return;
        }
        DisciplineStore.setTaskApp(getContext(), key, call.getString("appId", ""));
        call.resolve();
    }

    @PluginMethod
    public void getTaskApps(PluginCall call) {
        try {
            JSObject result = new JSObject();
            result.put("map", new JSObject(DisciplineStore.getTaskApps(getContext()).toString()));
            call.resolve(result);
        } catch (JSONException e) {
            call.reject("Could not read the task apps");
        }
    }

    /** Opens another app, like tapping its icon. */
    @PluginMethod
    public void openApp(PluginCall call) {
        String id = call.getString("id");
        Context ctx = getContext();
        Intent intent = id == null ? null : ctx.getPackageManager().getLaunchIntentForPackage(id);
        if (intent == null) {
            call.reject("That app is not on this phone");
            return;
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            ctx.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open that app");
        }
    }

    // ---- Alarms ----

    @PluginMethod
    public void saveAlarm(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.isEmpty()) {
            call.reject("Missing alarm id");
            return;
        }
        try {
            JSONObject alarm = new JSONObject();
            alarm.put("id", id);
            alarm.put("label", call.getString("label", ""));
            alarm.put("hour", call.getInt("hour", 8));
            alarm.put("minute", call.getInt("minute", 0));
            alarm.put("repeat", call.getBoolean("repeat", false));
            alarm.put("taskId", call.getString("taskId", ""));
            alarm.put("appKey", call.getString("appKey", ""));
            alarm.put("skipDate", "");
            DisciplineStore.putAlarm(getContext(), alarm);
            long at = DisciplineStore.schedule(getContext(), alarm);
            JSObject result = new JSObject();
            result.put("nextAt", at);
            call.resolve(result);
        } catch (JSONException e) {
            call.reject("Could not save the alarm");
        }
    }

    @PluginMethod
    public void removeAlarm(PluginCall call) {
        String id = call.getString("id");
        if (id != null) DisciplineStore.removeAlarm(getContext(), id);
        call.resolve();
    }

    @PluginMethod
    public void listAlarms(PluginCall call) {
        JSONArray all = DisciplineStore.getAlarms(getContext());
        JSArray list = new JSArray();
        for (int i = 0; i < all.length(); i++) {
            JSONObject a = all.optJSONObject(i);
            if (a == null) continue;
            try {
                list.put(new JSObject(a.toString()));
            } catch (JSONException ignored) {
            }
        }
        JSObject result = new JSObject();
        result.put("alarms", list);
        call.resolve(result);
    }

    /** Tells a daily alarm that today's task is already finished, so it stays quiet today. */
    @PluginMethod
    public void markDone(PluginCall call) {
        String id = call.getString("id");
        String date = call.getString("date", "");
        JSONObject alarm = id == null ? null : DisciplineStore.getAlarm(getContext(), id);
        if (alarm != null) {
            try {
                alarm.put("skipDate", date);
                DisciplineStore.putAlarm(getContext(), alarm);
            } catch (JSONException ignored) {
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void testAlarm(PluginCall call) {
        DisciplineStore.scheduleAt(
            getContext(), DisciplineStore.TEST_ID, "Test alarm", System.currentTimeMillis() + 8000);
        call.resolve();
    }

    // ---- Lock ----

    /** The task is done: stop the sound and let the blocked apps open again. */
    @PluginMethod
    public void complete(PluginCall call) {
        Context ctx = getContext();
        DisciplineStore.setLocked(ctx, false);
        DisciplineStore.setActiveAlarm(ctx, "");
        DisciplineStore.setActiveTask(ctx, "");
        DisciplineStore.setActiveAppKey(ctx, "");
        ctx.stopService(new Intent(ctx, AlarmService.class));
        call.resolve();
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        Context ctx = getContext();
        JSObject result = new JSObject();
        result.put("locked", DisciplineStore.isLocked(ctx));
        result.put("activeAlarmId", DisciplineStore.getActiveAlarm(ctx));
        result.put("activeTaskId", DisciplineStore.getActiveTask(ctx));
        result.put("ringing", AlarmService.ringing);
        result.put("waitingForCall", AlarmService.running && !AlarmService.ringing);
        result.put("accessibilityOn", BlockerService.instance != null);
        result.put("notificationsOn", NotificationManagerCompat.from(ctx).areNotificationsEnabled());
        boolean fullScreen = true;
        if (Build.VERSION.SDK_INT >= 34) {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            fullScreen = nm != null && nm.canUseFullScreenIntent();
        }
        result.put("fullScreenOn", fullScreen);
        call.resolve(result);
    }

    // ---- Phone settings screens ----

    @PluginMethod
    public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getActivity() != null) {
            ActivityCompat.requestPermissions(
                getActivity(), new String[] {Manifest.permission.POST_NOTIFICATIONS}, 7001);
        }
        call.resolve();
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        String page = call.getString("page", "");
        Context ctx = getContext();
        Intent intent;
        if ("accessibility".equals(page)) {
            intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        } else if ("notifications".equals(page)) {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, ctx.getPackageName());
        } else if ("battery".equals(page)) {
            intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
        } else if ("fullscreen".equals(page) && Build.VERSION.SDK_INT >= 34) {
            intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
            intent.setData(Uri.parse("package:" + ctx.getPackageName()));
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + ctx.getPackageName()));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            ctx.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open that settings page");
        }
    }
}
