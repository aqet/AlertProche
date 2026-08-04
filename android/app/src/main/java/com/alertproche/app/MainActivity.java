package com.alertproche.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // ID du canal — doit correspondre exactement au channelId envoyé par le backend FCM
    public static final String CHANNEL_ID = "alertproche_notifications";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannel();
    }

    /**
     * Crée le canal de notification Android 8+ avec IMPORTANCE_HIGH
     * pour que les notifications s'affichent en bannière plein écran
     * et ne restent pas bloquées en simple Heads-Up dans la barre.
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Alertes AlertProche";
            String description = "Nouvelles alertes de disparitions, abus et appels à l'aide";

            // IMPORTANCE_HIGH = bannière flottante + son + vibration
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    name,
                    NotificationManager.IMPORTANCE_HIGH
            );

            channel.setDescription(description);
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setShowBadge(true);

            // Visible sur l'écran verrouillé
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            NotificationManager manager =
                    (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
