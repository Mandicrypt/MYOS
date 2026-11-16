package site.myosapp.app;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.content.Intent;
import android.view.accessibility.AccessibilityEvent;
import java.util.Set;

/**
 * Watches which app comes to the front. While a task is waiting, any app you chose to block is
 * pushed away and MYOS is shown instead. It only reads the app name. It never reads what is on screen.
 */
public class BlockerService extends AccessibilityService {
    /** Set while the service is switched on in the phone's Accessibility settings. */
    public static volatile BlockerService instance;

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
    }

    @Override
    public boolean onUnbind(Intent intent) {
        instance = null;
        return super.onUnbind(intent);
    }

    @Override
    public void onDestroy() {
        instance = null;
        super.onDestroy();
    }

    @Override
    public void onInterrupt() {}

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return;
        CharSequence name = event.getPackageName();
        if (name == null) return;
        String pkg = name.toString();
        if (pkg.equals(getPackageName())) return;
        if (!DisciplineStore.isLocked(this)) return;

        Set<String> blocked = DisciplineStore.getBlocked(this);
        if (!blocked.contains(pkg)) return;
        // The app this task needs stays open.
        if (pkg.equals(DisciplineStore.getActiveTaskApp(this))) return;
        openMyos(this);
    }

    /** Brings MYOS to the front. Works from the background because this is an accessibility service. */
    public static void openMyos(Context ctx) {
        Context from = instance != null ? instance : ctx;
        Intent i = new Intent(from, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        try {
            from.startActivity(i);
        } catch (Exception ignored) {
            // Without the Accessibility switch on, the phone may refuse. The alarm notification still opens MYOS.
        }
    }
}
