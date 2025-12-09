package com.memoway.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
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
        
        // 화면이 꺼지지 않도록 설정 (WebView unload 방지)
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
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
     * Bridge 초기화 후 WebView 설정 및 커스텀 WebViewClient 적용
     */
    @Override
    public void onStart() {
        super.onStart();
        Log.d("MEMOWAY", "MainActivity onStart - Activity started");
        
        // Bridge가 준비되면 WebView 설정
        Bridge bridge = getBridge();
        if (bridge != null) {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                setupWebView(webView);
            } else {
                // WebView가 아직 준비되지 않았으면 지연 후 재시도
                Handler handler = new Handler(Looper.getMainLooper());
                handler.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        Bridge bridge = getBridge();
                        if (bridge != null) {
                            WebView webView = bridge.getWebView();
                            if (webView != null) {
                                setupWebView(webView);
                            }
                        }
                    }
                }, 500);
            }
        }
        
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
     * WebView 설정 및 커스텀 WebViewClient 적용
     */
    private void setupWebView(WebView webView) {
        try {
            WebSettings settings = webView.getSettings();
            
            // file:// 프로토콜에서 리소스 로드를 허용 (CSS, JS, images 등)
            settings.setAllowFileAccess(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                settings.setAllowFileAccessFromFileURLs(true);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
                settings.setAllowUniversalAccessFromFileURLs(true);
            }
            
            // DOM Storage 활성화
            settings.setDomStorageEnabled(true);
            
            // JavaScript 활성화
            settings.setJavaScriptEnabled(true);
            
            // 화면이 꺼지지 않도록 설정 (WebView unload 방지)
            webView.setKeepScreenOn(true);
            
            // 커스텀 WebViewClient 설정
            webView.setWebViewClient(new CustomWebViewClient());
            
            Log.d("MEMOWAY", "WebView configured with file access enabled and custom WebViewClient");
        } catch (Exception e) {
            Log.e("MEMOWAY", "Error setting up WebView", e);
        }
    }
    
    /**
     * 커스텀 WebViewClient: 로컬 파일 강제 로드 및 URL 처리
     */
    private class CustomWebViewClient extends WebViewClient {
        private static final String LOCAL_FILE_PATH = "file:///android_asset/public/index.html";
        
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            Log.d("MEMOWAY", "shouldOverrideUrlLoading called with URL: " + url);
            
            // localhost나 잘못된 URL인 경우 로컬 파일로 리다이렉트
            if (url.contains("localhost") || url.contains("127.0.0.1") || 
                url.startsWith("https://localhost") || url.startsWith("http://localhost")) {
                Log.w("MEMOWAY", "Invalid localhost URL detected, loading local file instead: " + url);
                view.loadUrl(LOCAL_FILE_PATH);
                return true;
            }
            
            // Capacitor 내부 URL (capacitor://, https://localhost 등)은 WebView에서 처리
            if (url.startsWith("capacitor://") || url.startsWith("https://localhost") || 
                url.startsWith("http://localhost")) {
                return false; // WebView에서 처리
            }
            
            // 외부 URL은 기본 브라우저로 열기
            if (url.startsWith("http://") || url.startsWith("https://")) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    Log.d("MEMOWAY", "Opening external URL in browser: " + url);
                    return true;
                } catch (Exception e) {
                    Log.e("MEMOWAY", "Failed to open external URL", e);
                    return false;
                }
            }
            
            // 기타 URL은 WebView에서 처리
            return false;
        }
        
        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            Log.d("MEMOWAY", "Page finished loading: " + url);
            
            // localhost나 잘못된 URL이 로드된 경우 로컬 파일로 리다이렉트
            if (url.contains("localhost") || url.contains("127.0.0.1") || 
                url.startsWith("https://localhost") || url.startsWith("http://localhost")) {
                Log.w("MEMOWAY", "Invalid URL loaded, redirecting to local file");
                Handler handler = new Handler(Looper.getMainLooper());
                handler.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        view.loadUrl(LOCAL_FILE_PATH);
                    }
                }, 100);
            }
        }
    }
    
    /**
     * Activity가 포그라운드로 돌아올 때 WebView 상태 확인 및 복구
     */
    @Override
    public void onResume() {
        super.onResume();
        Log.d("MEMOWAY", "MainActivity onResume - Activity resumed");
        
        // WebView가 백그라운드에서 unload되지 않도록 keepScreenOn 재설정
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        
        // WebView 상태 확인 및 복구
        Bridge bridge = getBridge();
        if (bridge != null) {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                // keepScreenOn 재설정
                webView.setKeepScreenOn(true);
                
                // WebView가 비어있거나 잘못된 URL이 로드된 경우 로컬 파일로 리다이렉트
                String currentUrl = webView.getUrl();
                if (currentUrl == null || currentUrl.isEmpty() || 
                    currentUrl.contains("localhost") || currentUrl.contains("127.0.0.1")) {
                    Log.w("MEMOWAY", "Invalid or empty URL detected in onResume, loading local file");
                    webView.loadUrl("file:///android_asset/public/index.html");
                }
            }
        }
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

