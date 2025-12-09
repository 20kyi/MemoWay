package com.memoway.app;

import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;

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
    }
}
