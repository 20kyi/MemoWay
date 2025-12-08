package com.memoway.app;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.kakao.sdk.auth.model.OAuthToken;
import com.kakao.sdk.user.UserApiClient;
import com.kakao.sdk.user.model.User;
import kotlin.Unit;

@CapacitorPlugin(name = "KakaoLogin")
public class KakaoLoginPlugin extends Plugin {
    
    @PluginMethod
    public void login(PluginCall call) {
        Activity activity = getActivity();
        
        // 카카오톡이 설치되어 있는지 확인
        if (UserApiClient.getInstance().isKakaoTalkLoginAvailable(activity)) {
            // 카카오톡 로그인
            UserApiClient.getInstance().loginWithKakaoTalk(activity, (token, error) -> {
                if (error != null) {
                    Exception exception = error instanceof Exception ? (Exception) error : new Exception(error.getMessage());
                    call.reject("카카오톡 로그인 실패", exception);
                    return Unit.INSTANCE;
                } else if (token != null) {
                    // 사용자 정보 가져오기
                    getUserInfo(call, token);
                    return Unit.INSTANCE;
                }
                return Unit.INSTANCE;
            });
        } else {
            // 카카오계정으로 로그인
            UserApiClient.getInstance().loginWithKakaoAccount(activity, (token, error) -> {
                if (error != null) {
                    Exception exception = error instanceof Exception ? (Exception) error : new Exception(error.getMessage());
                    call.reject("카카오계정 로그인 실패", exception);
                    return Unit.INSTANCE;
                } else if (token != null) {
                    getUserInfo(call, token);
                    return Unit.INSTANCE;
                }
                return Unit.INSTANCE;
            });
        }
    }
    
    private void getUserInfo(PluginCall call, OAuthToken token) {
        // ⚠️ 중요: UserApiClient.getInstance().me()는 /v2/user/me API를 호출합니다
        // 이 메서드가 반환하는 User 객체의 getId()가 실제 카카오 사용자 ID입니다
        UserApiClient.getInstance().me((user, error) -> {
            if (error != null) {
                Exception exception = error instanceof Exception ? (Exception) error : new Exception(error.getMessage());
                call.reject("사용자 정보 조회 실패", exception);
                return Unit.INSTANCE;
            } else if (user != null) {
                JSObject result = new JSObject();
                result.put("accessToken", token.getAccessToken());
                result.put("refreshToken", token.getRefreshToken());
                
                // ⚠️ CRITICAL: kakaoId는 반드시 String으로 변환하여 전달
                // user.getId()는 Long 타입일 수 있으므로 String으로 변환
                Long userId = user.getId();
                if (userId == null) {
                    call.reject("카카오 사용자 ID를 가져올 수 없습니다", new Exception("user.getId() returned null"));
                    return Unit.INSTANCE;
                }
                
                // Long을 String으로 변환 (정밀도 손실 방지)
                String kakaoId = String.valueOf(userId);
                result.put("id", kakaoId);
                
                // 이메일과 프로필 정보는 null 체크 필요
                if (user.getKakaoAccount() != null) {
                    if (user.getKakaoAccount().getEmail() != null) {
                        result.put("email", user.getKakaoAccount().getEmail());
                    }
                    if (user.getKakaoAccount().getProfile() != null) {
                        result.put("nickname", user.getKakaoAccount().getProfile().getNickname());
                        result.put("profileImage", user.getKakaoAccount().getProfile().getProfileImageUrl());
                    }
                }
                
                call.resolve(result);
                return Unit.INSTANCE;
            } else {
                call.reject("사용자 정보를 가져올 수 없습니다", new Exception("user is null"));
                return Unit.INSTANCE;
            }
        });
    }
    
    @PluginMethod
    public void logout(PluginCall call) {
        UserApiClient.getInstance().logout((error) -> {
            if (error != null) {
                Exception exception = error instanceof Exception ? (Exception) error : new Exception(error.getMessage());
                call.reject("로그아웃 실패", exception);
                return Unit.INSTANCE;
            } else {
                call.resolve();
                return Unit.INSTANCE;
            }
        });
    }
}


































