package com.memoway.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.RenderProcessGoneDetail;
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
     * Bridge 초기화 후 WebView 쿠키 설정 재적용 및 timers 재개
     */
    @Override
    public void onStart() {
        super.onStart();
        Log.d("MEMOWAY", "MainActivity onStart - Activity started");
        
        // Bridge가 준비되면 WebView 쿠키 설정 재적용 및 timers 재개
        Bridge bridge = getBridge();
        if (bridge != null) {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                try {
                    // 쿠키 설정 재적용
                    CookieManager cookieManager = CookieManager.getInstance();
                    cookieManager.setAcceptCookie(true);
                    
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        cookieManager.setAcceptThirdPartyCookies(webView, true);
                        cookieManager.flush();
                    }
                    
                    // WebView timers도 여기서 재개 (onResume에서 실패한 경우 대비)
                    try {
                        webView.resumeTimers();
                        webView.onResume();
                    } catch (Exception e) {
                        Log.e("MEMOWAY", "WebView resume failed in onStart", e);
                    }
                    
                    // WebView 렌더러 크래시 감지를 위한 WebViewClient 설정
                    webView.setWebViewClient(new WebViewClient() {
                        @Override
                        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                            Log.e("MEMOWAY", "WebView Renderer crashed - restarting activity");
                            MainActivity.this.recreate();
                            return true;
                        }
                    });
                    
                    Log.d("MEMOWAY", "WebView cookie configuration reapplied and timers resumed after bridge initialization");
                } catch (Exception e) {
                    Log.e("MEMOWAY", "Error reapplying WebView cookie configuration or resuming timers", e);
                }
            }
        }
        
        // WebView 초기화 후에 서비스 시작 및 배터리 최적화 확인
        // 이렇게 하면 WebView 로딩에 방해되지 않음
        Handler handler = new Handler(Looper.getMainLooper());
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                // 배터리 최적화 예외 확인 및 요청
                checkAndRequestBatteryOptimization();
                
                // Foreground Service 시작 (백그라운드 실행 유지)
                startForegroundService();
            }
        }, 500); // WebView 초기화 후 500ms 지연
    }
    
    /**
     * Activity가 포그라운드로 돌아올 때 WebView timers를 강제로 재개
     * idle 상태에서 suspend되는 것을 방지
     */
    @Override
    public void onResume() {
        super.onResume();
        Log.d("MEMOWAY", "MainActivity onResume - Activity resumed");
        
        // WebView timers를 강제로 재개하여 idle 상태에서 suspend되지 않도록 함
        // 이는 idle 상태에서 WebView가 suspend되는 것을 방지하는 핵심 코드
        Bridge bridge = getBridge();
        if (bridge != null) {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                try {
                    // WebView timers 강제 재개 (idle suspend 방지) - 항상 호출
                    webView.resumeTimers();
                    // WebView 자체도 resume
                    webView.onResume();
                    Log.d("MEMOWAY", "MainActivity onResume - WebView timers resumed and WebView resumed (idle suspend prevented)");
                } catch (Exception e) {
                    Log.e("MEMOWAY", "WebView resume failed", e);
                }
            } else {
                Log.w("MEMOWAY", "MainActivity onResume - WebView is null, will retry");
            }
        } else {
            Log.w("MEMOWAY", "MainActivity onResume - Bridge is null, will retry");
        }
        
        // Bridge가 아직 준비되지 않은 경우를 대비해 지연 후 재시도
        Handler handler = new Handler(Looper.getMainLooper());
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                Bridge bridge = getBridge();
                if (bridge != null) {
                    WebView webView = bridge.getWebView();
                    if (webView != null) {
                        try {
                            webView.resumeTimers();
                            webView.onResume();
                            Log.d("MEMOWAY", "MainActivity onResume - WebView timers resumed (delayed retry)");
                        } catch (Exception e) {
                            Log.e("MEMOWAY", "WebView resume failed (delayed retry)", e);
                        }
                    }
                }
            }
        }, 100);
    }
    
    /**
     * Activity가 백그라운드로 갈 때 WebView timers를 일시 중지하지 않음
     * idle 상태에서 suspend되는 것을 방지하기 위해 pauseTimers 호출을 제거
     */
    @Override
    public void onPause() {
        Log.d("MEMOWAY", "MainActivity onPause - Activity paused (NOT pausing WebView timers to prevent suspend)");
        
        // WebView timers를 pause하지 않음 - idle 상태에서 suspend되는 것을 방지
        // 기존 코드: webView.pauseTimers() - 제거됨
        
        super.onPause();
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
    
    /**
     * WebView 렌더러 크래시 감지 및 Activity 재생성
     * WebViewClient에서 호출됨
     */
    public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
        Log.e("MEMOWAY", "WebView Renderer crashed - restarting activity");
        this.recreate();
        return true;
    }
}

