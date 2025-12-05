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
        UserApiClient.getInstance().me((user, error) -> {
            if (error != null) {
                Exception exception = error instanceof Exception ? (Exception) error : new Exception(error.getMessage());
                call.reject("사용자 정보 조회 실패", exception);
                return Unit.INSTANCE;
            } else if (user != null) {
                JSObject result = new JSObject();
                result.put("accessToken", token.getAccessToken());
                result.put("refreshToken", token.getRefreshToken());
                result.put("id", user.getId());
                
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
            }
            return Unit.INSTANCE;
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

































