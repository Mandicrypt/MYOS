package site.myosapp.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;
import org.json.JSONObject;

/** Wakes up when an alarm time arrives, and starts the ringing. */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        String id = intent.getStringExtra("id");
        String label = intent.getStringExtra("label");
        if (id == null) return;

        JSONObject alarm = DisciplineStore.getAlarm(ctx, id);
        String taskId = alarm == null ? "" : alarm.optString("taskId", "");
        String appKey = alarm == null ? "" : alarm.optString("appKey", "");
        if (alarm != null) {
            if (alarm.optBoolean("repeat", false)) {
                // Daily alarm: set tomorrow's ring first.
                DisciplineStore.schedule(ctx, alarm);
            } else {
                // One-time alarm: forget it once it rings.
                DisciplineStore.removeAlarm(ctx, id);
            }
            // The task for today was already finished, so stay quiet.
            if (DisciplineStore.todayText().equals(alarm.optString("skipDate"))) return;
        }

        Intent service = new Intent(ctx, AlarmService.class);
        service.putExtra("id", id);
        service.putExtra("taskId", taskId);
        service.putExtra("appKey", appKey);
        service.putExtra("label", label == null || label.isEmpty() ? "Time to do your task" : label);
        ContextCompat.startForegroundService(ctx, service);
    }
}
