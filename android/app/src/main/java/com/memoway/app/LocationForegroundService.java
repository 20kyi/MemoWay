package com.memoway.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

/**
 * Foreground Service for keeping the app running in background
 * 위치 추적 및 백그라운드 실행을 위한 Foreground Service
 */
public class LocationForegroundService extends Service {
    private static final String CHANNEL_ID = "LocationForegroundServiceChannel";
    private static final int NOTIFICATION_ID = 1;
    
    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Foreground Service로 시작 (앱이 백그라운드로 가도 계속 실행)
        startForeground(NOTIFICATION_ID, createNotification());
        
        // Service가 종료되어도 자동으로 재시작
        return START_STICKY;
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null; // Bound service가 아니므로 null 반환
    }
    
    /**
     * Notification Channel 생성 (Android 8.0+ 필수)
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "위치 추적 서비스",
                NotificationManager.IMPORTANCE_LOW // 사용자에게 방해하지 않는 낮은 우선순위
            );
            channel.setDescription("앱이 백그라운드에서 위치를 추적하고 있습니다");
            channel.setShowBadge(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    /**
     * Foreground Service용 Notification 생성
     */
    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("MemoWay 실행 중")
            .setContentText("위치 추적 및 메모 알림이 활성화되어 있습니다")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true) // 사용자가 닫을 수 없도록 설정
            .setPriority(NotificationCompat.PRIORITY_LOW) // 배터리 절약
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        // Service가 종료되면 자동으로 재시작되도록 함
    }
}
