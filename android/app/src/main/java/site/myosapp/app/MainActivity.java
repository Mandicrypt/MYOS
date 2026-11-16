package site.myosapp.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins must be added before the screen starts.
        registerPlugin(DisciplinePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
