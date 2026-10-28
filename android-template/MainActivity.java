package io.github.garzondesnedot.classprogress.connected;

import android.os.Build;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.Insets;
import android.view.View;
import android.view.WindowInsets;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Android 15+ enforces edge-to-edge for apps targeting API 35+.
        // Keep system bars outside the web content, including on folding displays.
        if (Build.VERSION.SDK_INT >= 35) {
            getWindow().setDecorFitsSystemWindows(false);
            View root = findViewById(android.R.id.content);
            root.setBackgroundColor(Color.BLACK);
            root.setOnApplyWindowInsetsListener((view, windowInsets) -> {
                int types = WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout();
                Insets bars = windowInsets.getInsets(types);
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                // Preserve IME insets for the keyboard, while avoiding a second system-bar inset.
                return new WindowInsets.Builder(windowInsets).setInsets(types, Insets.NONE).build();
            });
            root.requestApplyInsets();
        }
    }
}
