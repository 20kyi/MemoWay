/**
 * Capacitor 커스텀 플러그인 타입 정의
 */

export interface KakaoLoginResult {
  accessToken: string;
  refreshToken?: string;
  id: string;
  email?: string;
  nickname?: string;
  profileImage?: string;
}

export interface KakaoLoginPlugin {
  login: () => Promise<KakaoLoginResult>;
  logout?: () => Promise<void>;
}

