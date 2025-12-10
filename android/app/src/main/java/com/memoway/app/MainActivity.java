package com.memoway.app;

import android.os.Bundle;
import android.util.Log;
import android.view.Window;
import android.view.WindowManager;
import android.graphics.Color;

import com.getcapacitor.BridgeActivity;
import com.kakao.sdk.common.KakaoSdk;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MEMOWAY";
    // 카카오 네이티브 앱 키 (카카오 개발자 콘솔에서 발급받은 네이티브 앱 키)
    private static final String KAKAO_NATIVE_APP_KEY = "972181125f7cd0fb9dbd9442fdde314e";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 카카오 SDK 초기화
        try {
            KakaoSdk.init(this, KAKAO_NATIVE_APP_KEY);
            Log.d(TAG, "Kakao SDK initialized");
        } catch (Exception e) {
            Log.e(TAG, "Kakao SDK init error", e);
        }

        super.onCreate(savedInstanceState);

        // 화면이 꺼지지 않도록 설정
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // 상태바 아이콘이 잘 보이도록 설정
        Window window = getWindow();
        
        // 상태바 배경을 투명하게 설정 (Capacitor StatusBar 플러그인이 색상을 제어)
        // 이렇게 하면 JavaScript에서 설정한 배경색이 적용됨
        window.setStatusBarColor(Color.TRANSPARENT);
        
        // 상태바가 콘텐츠 위에 오버레이되지 않도록 설정
        // (overlay: false일 때 상태바 영역이 콘텐츠와 분리됨)
        window.getDecorView().setSystemUiVisibility(
            window.getDecorView().getSystemUiVisibility() |
            android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }
}
