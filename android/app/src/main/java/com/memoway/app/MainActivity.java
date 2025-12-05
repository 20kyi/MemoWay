package com.memoway.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;
import com.kakao.sdk.common.KakaoSdk;

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
        super.onCreate(savedInstanceState);
        
        // Android WebView 쿠키 설정 - SameSite=None, Secure 쿠키 지원을 위해 필수
        configureWebViewCookies();
        
        // 카카오 SDK 초기화 (안드로이드 네이티브 카카오 로그인을 위해 필요)
        try {
            KakaoSdk.init(this, KAKAO_NATIVE_APP_KEY);
            android.util.Log.d("MainActivity", "Kakao SDK initialized successfully");
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "Kakao SDK initialization error", e);
        }
    }
    
    /**
     * WebView 쿠키 설정
     * Android WebView에서 cross-site Secure 쿠키(SameSite=None) 저장을 위해 필수
     */
    private void configureWebViewCookies() {
        try {
            CookieManager cookieManager = CookieManager.getInstance();
            
            // 쿠키 허용 활성화 (전역 설정)
            cookieManager.setAcceptCookie(true);
            
            android.util.Log.d("MainActivity", "Global cookie acceptance enabled");
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "Error configuring global cookie settings", e);
        }
    }
    
    /**
     * Bridge 초기화 후 WebView 쿠키 설정 재적용
     */
    @Override
    public void onStart() {
        super.onStart();
        
        // Bridge가 준비되면 WebView 쿠키 설정 재적용
        Bridge bridge = getBridge();
        if (bridge != null) {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                try {
                    CookieManager cookieManager = CookieManager.getInstance();
                    cookieManager.setAcceptCookie(true);
                    
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        cookieManager.setAcceptThirdPartyCookies(webView, true);
                        cookieManager.flush();
                    }
                    
                    android.util.Log.d("MainActivity", "WebView cookie configuration reapplied after bridge initialization");
                } catch (Exception e) {
                    android.util.Log.e("MainActivity", "Error reapplying WebView cookie configuration", e);
                }
            }
        }
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }
}

