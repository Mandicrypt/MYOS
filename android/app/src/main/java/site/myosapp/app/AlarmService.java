package site.myosapp.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * Rings the alarm until the task is done.
 * If a call is going on (phone or WhatsApp-style), it waits quietly and starts the moment the call ends.
 */
public class AlarmService extends Service {
    private static final String CHANNEL = "myos_alarm";
    private static final int NOTIFICATION_ID = 4242;
    private static final long CHECK_EVERY_MS = 1500;

    /** True while this service is alive (ringing or waiting for a call to end). */
    public static volatile boolean running = false;
    /** True only while sound is playing. */
    public static volatile boolean ringing = false;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private MediaPlayer player;
    private Vibrator vibrator;
    private String alarmId = "";
    private String label = "Time to do your task";

    private final Runnable check = new Runnable() {
        @Override
        public void run() {
            if (!running) return;
            if (inCall()) {
                if (ringing) stopRinging();
                updateNotification("Waiting for your call to end");
            } else if (!ringing) {
                startRinging();
            }
            handler.postDelayed(this, CHECK_EVERY_MS);
        }
    };

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getStringExtra("id") != null) {
            alarmId = intent.getStringExtra("id");
            String l = intent.getStringExtra("label");
            if (l != null && !l.isEmpty()) label = l;
            DisciplineStore.setActiveAlarm(this, alarmId);
            String t = intent.getStringExtra("taskId");
            DisciplineStore.setActiveTask(this, t == null ? "" : t);
            String k = intent.getStringExtra("appKey");
            DisciplineStore.setActiveAppKey(this, k == null ? "" : k);
        } else {
            // The phone restarted this service by itself. Carry on only if a task is still waiting.
            alarmId = DisciplineStore.getActiveAlarm(this);
            if (alarmId.isEmpty() || !DisciplineStore.isLocked(this)) {
                stopSelf();
                return START_NOT_STICKY;
            }
        }

        createChannel();
        int type = Build.VERSION.SDK_INT >= 29 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
        ServiceCompat.startForeground(
            this, NOTIFICATION_ID, buildNotification(inCall() ? "Waiting for your call to end" : label), type);

        running = true;
        handler.removeCallbacks(check);
        handler.post(check);
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        running = false;
        handler.removeCallbacks(check);
        stopRinging();
        super.onDestroy();
    }

    // ---- Calls ----

    private boolean inCall() {
        AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (am == null) return false;
        int mode = am.getMode();
        return mode == AudioManager.MODE_IN_CALL
            || mode == AudioManager.MODE_IN_COMMUNICATION
            || mode == AudioManager.MODE_RINGTONE;
    }

    // ---- Sound ----

    private void startRinging() {
        ringing = true;
        // From this moment, the blocked apps are shut out until the task is done.
        DisciplineStore.setLocked(this, true);
        updateNotification(label);

        try {
            AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                int max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                int wanted = (int) Math.ceil(max * 0.6);
                if (am.getStreamVolume(AudioManager.STREAM_ALARM) < wanted) {
                    am.setStreamVolume(AudioManager.STREAM_ALARM, wanted, 0);
                }
            }

            Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);

            player = new MediaPlayer();
            player.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
            player.setDataSource(this, uri);
            player.setLooping(true);
            player.prepare();
            player.start();
        } catch (Exception e) {
            releasePlayer();
        }

        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                vibrator.vibrate(VibrationEffect.createWaveform(new long[] {0, 700, 500}, 0));
            }
        } catch (Exception ignored) {
        }

        // Bring MYOS to the front so the task is the first thing in view.
        BlockerService.openMyos(this);
    }

    private void stopRinging() {
        ringing = false;
        releasePlayer();
        try {
            if (vibrator != null) vibrator.cancel();
        } catch (Exception ignored) {
        }
    }

    private void releasePlayer() {
        if (player == null) return;
        try {
            if (player.isPlaying()) player.stop();
        } catch (Exception ignored) {
        }
        try {
            player.release();
        } catch (Exception ignored) {
        }
        player = null;
    }

    // ---- Notification ----

    private void createChannel() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel channel =
            new NotificationChannel(CHANNEL, "MYOS alarm", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Rings until your task is done");
        channel.setSound(null, null); // the service plays the sound itself
        channel.enableVibration(false);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(channel);
    }

    private Notification buildNotification(String text) {
        Intent open = new Intent(this, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        PendingIntent pi = PendingIntent.getActivity(
            this, 1, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("MYOS")
            .setContentText(text)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(pi)
            .setFullScreenIntent(pi, true)
            .build();
    }

    private void updateNotification(String text) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification(text));
    }
}
