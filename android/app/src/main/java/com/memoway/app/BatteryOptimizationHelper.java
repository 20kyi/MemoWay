package com.memoway.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

/**
 * 배터리 최적화 예외 설정을 위한 헬퍼 클래스
 */
public class BatteryOptimizationHelper {
    private static final String TAG = "BatteryOptimizationHelper";
    
    /**
     * 배터리 최적화 예외가 설정되어 있는지 확인
     * @param context Context
     * @return true if battery optimization is ignored, false otherwise
     */
    public static boolean isIgnoringBatteryOptimizations(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                android.os.PowerManager pm = (android.os.PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    return pm.isIgnoringBatteryOptimizations(context.getPackageName());
                }
            } catch (Exception e) {
                Log.e(TAG, "Error checking battery optimization status", e);
            }
        }
        return true; // Android 6.0 미만에서는 항상 true 반환
    }
    
    /**
     * 배터리 최적화 예외 설정 화면 열기
     * @param context Context
     */
    public static void requestIgnoreBatteryOptimizations(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                Log.d(TAG, "Opened battery optimization settings");
            } catch (Exception e) {
                // 일부 기기에서는 ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS가 작동하지 않을 수 있음
                // 대신 일반 설정 화면으로 이동
                Log.w(TAG, "Failed to open battery optimization request, opening settings instead", e);
                openBatterySettings(context);
            }
        } else {
            // Android 6.0 미만에서는 설정 화면으로 이동
            openBatterySettings(context);
        }
    }
    
    /**
     * 배터리 설정 화면 열기 (일반 설정)
     * @param context Context
     */
    public static void openBatterySettings(Context context) {
        try {
            Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            Log.d(TAG, "Opened battery settings");
        } catch (Exception e) {
            Log.e(TAG, "Failed to open battery settings", e);
            // 최후의 수단: 앱 정보 화면으로 이동
            try {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } catch (Exception e2) {
                Log.e(TAG, "Failed to open app settings", e2);
            }
        }
    }
}
