package com.memoway.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;
import com.kakao.sdk.common.KakaoSdk;
import android.util.Log;

/**
 * MainActivity for MemoWay Android App
 * 
 * Capacitor 7에서는 @CapacitorPlugin 어노테이션이 있는 플러그인이 자동으로 등록됩니다.
 * 따라서 init() 메서드를 호출할 필요가 없습니다.
 */
public class MainActivity extends BridgeActivity {
    // 카카오 네이티브 앱 키 (카카오 개발자 콘솔에서 발급받은 네이티브 앱 키)
    private static final String KAKAO_NATIVE_APP_KEY = "972181125f7cd0fb9dbd9442fdde314e";
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Activity recreate 방지: savedInstanceState가 있으면 recreate가 발생한 것
        if (savedInstanceState != null) {
            Log.d("MEMOWAY", "MainActivity onCreate - Activity recreated (savedInstanceState != null), restoring state");
        } else {
            Log.d("MEMOWAY", "MainActivity onCreate - Activity created (fresh start)");
        }
        
        // 카카오 SDK 초기화 (WebView 초기화 전에 먼저 초기화)
        try {
            KakaoSdk.init(this, KAKAO_NATIVE_APP_KEY);
            Log.d("MEMOWAY", "Kakao SDK initialized successfully");
        } catch (Exception e) {
            Log.e("MEMOWAY", "Kakao SDK initialization error", e);
        }
        
        // BridgeActivity의 onCreate 호출 - 이 시점에서 WebView가 초기화됨
        super.onCreate(savedInstanceState);
        
        // WebView 초기화 후 쿠키 설정
        // Bridge가 준비되면 onStart에서 추가 설정을 수행함
    }
    
    /**
     * 배터리 최적화 예외 확인 및 요청
     */
    private void checkAndRequestBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!BatteryOptimizationHelper.isIgnoringBatteryOptimizations(this)) {
                Log.d("MEMOWAY", "Battery optimization is not ignored, requesting...");
                // 앱 시작 시 자동으로 배터리 최적화 예외 설정 화면 열기
                BatteryOptimizationHelper.requestIgnoreBatteryOptimizations(this);
            } else {
                Log.d("MEMOWAY", "Battery optimization is already ignored");
            }
        }
    }
    
    /**
     * Foreground Service 시작 (백그라운드 실행 유지)
     */
    private void startForegroundService() {
        try {
            Intent serviceIntent = new Intent(this, LocationForegroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
            Log.d("MEMOWAY", "Foreground service started");
        } catch (Exception e) {
            Log.e("MEMOWAY", "Failed to start foreground service", e);
        }
    }
    
    
    /**
     * Bridge 초기화 후 최소한의 설정만 수행
     */
    @Override
    public void onStart() {
        super.onStart();
        Log.d("MEMOWAY", "MainActivity onStart - Activity started");
        
        // WebView 초기화 후에 서비스 시작 및 배터리 최적화 확인
        // WebView 로딩에 방해되지 않도록 지연 실행
        Handler handler = new Handler(Looper.getMainLooper());
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                // 배터리 최적화 예외 확인 및 요청
                checkAndRequestBatteryOptimization();
                
                // Foreground Service 시작 (백그라운드 실행 유지)
                startForegroundService();
            }
        }, 1000); // WebView 초기화 후 1초 지연
    }
    
    /**
     * Activity가 포그라운드로 돌아올 때
     * Capacitor의 기본 동작을 사용하므로 최소한의 로직만 유지
     */
    @Override
    public void onResume() {
        super.onResume();
        Log.d("MEMOWAY", "MainActivity onResume - Activity resumed");
        // Capacitor가 WebView 생명주기를 자동으로 관리하므로 추가 로직 제거
    }
    
    /**
     * Activity가 백그라운드로 갈 때
     * Capacitor의 기본 동작을 사용하므로 최소한의 로직만 유지
     */
    @Override
    public void onPause() {
        super.onPause();
        Log.d("MEMOWAY", "MainActivity onPause - Activity paused");
        // Capacitor가 WebView 생명주기를 자동으로 관리하므로 추가 로직 제거
    }
    
    /**
     * Activity가 완전히 보이지 않게 될 때도 WebView를 destroy하지 않음
     */
    @Override
    public void onStop() {
        Log.d("MEMOWAY", "MainActivity onStop - Activity stopped (WebView preserved)");
        
        // WebView를 destroy하지 않음 - 상태 유지
        super.onStop();
    }
    
    /**
     * Activity가 소멸될 때만 로그 기록
     */
    @Override
    public void onDestroy() {
        Log.d("MEMOWAY", "MainActivity onDestroy - Activity destroyed");
        super.onDestroy();
    }
    
    /**
     * Activity 상태 저장 (recreate 방지)
     */
    @Override
    public void onSaveInstanceState(Bundle outState) {
        Log.d("MEMOWAY", "MainActivity onSaveInstanceState - Saving activity state");
        super.onSaveInstanceState(outState);
        // WebView 상태는 자동으로 저장되므로 추가 작업 불필요
    }
    
    /**
     * Activity 상태 복원 (recreate 후)
     */
    @Override
    public void onRestoreInstanceState(Bundle savedInstanceState) {
        Log.d("MEMOWAY", "MainActivity onRestoreInstanceState - Restoring activity state");
        super.onRestoreInstanceState(savedInstanceState);
        // WebView 상태는 자동으로 복원되므로 추가 작업 불필요
    }
    
    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        Log.d("MEMOWAY", "MainActivity onNewIntent - New intent received");
    }
    
}

