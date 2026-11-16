package site.myosapp.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Sets the alarms again after the phone restarts or the app updates. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        DisciplineStore.rescheduleAll(ctx);
    }
}
