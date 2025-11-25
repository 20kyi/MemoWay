declare global {
  interface Window {
    kakao: any;
  }
}

export function loadKakaoMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps) {
      resolve();
      return;
    }

    const apiKey = import.meta.env.VITE_KAKAO_API_KEY;
    
    // 상세한 디버깅 정보
    console.log('[Kakao Maps] Environment check:', {
      hasApiKey: !!apiKey,
      apiKeyType: apiKey ? (apiKey.length > 30 ? 'JavaScript Key (expected)' : 'Native App Key (may not work)') : 'NOT SET',
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'N/A',
      allViteEnvKeys: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')),
      mode: import.meta.env.MODE,
      dev: import.meta.env.DEV,
      prod: import.meta.env.PROD,
    });
    
    if (!apiKey) {
      const error = "Kakao Maps API key not configured. Map features will be disabled.";
      console.error('[Kakao Maps]', error);
      console.error('[Kakao Maps] Available env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
      console.error('[Kakao Maps] Please check:');
      console.error('  1. .env file exists and contains VITE_KAKAO_API_KEY');
      console.error('  2. Server was restarted after adding the key');
      console.error('  3. For JavaScript SDK, use JavaScript Key (not Native App Key)');
      reject(new Error(error));
      return;
    }

    // API 키 타입 검증 (JavaScript 키는 보통 32자 이상)
    if (apiKey.length < 30) {
      console.warn('[Kakao Maps] WARNING: API key seems to be a Native App Key.');
      console.warn('[Kakao Maps] JavaScript SDK requires JavaScript Key (usually 32+ characters).');
      console.warn('[Kakao Maps] Please check Kakao Developer Console > 앱 키 > JavaScript 키');
    }

    console.log('[Kakao Maps] Loading SDK with API key:', apiKey.substring(0, 10) + '...');

    // 타임아웃 설정 (30초)
    const timeout = setTimeout(() => {
      const error = "Kakao Maps SDK load timeout - 네트워크 연결을 확인하거나 API 키 설정을 확인해주세요.";
      console.error(error);
      reject(new Error(error));
    }, 30000);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;
    
    script.onload = () => {
      clearTimeout(timeout);
      console.log('[Kakao Maps] Script loaded, initializing...');
      
      // 추가 대기 시간 (네이티브 앱에서 SDK 초기화 시간 확보)
      setTimeout(() => {
        if (window.kakao && window.kakao.maps) {
          try {
            window.kakao.maps.load(() => {
              console.log("[Kakao Maps] SDK loaded successfully");
              resolve();
            });
          } catch (error) {
            console.error("[Kakao Maps] Load error:", error);
            console.error("[Kakao Maps] Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
            reject(new Error("Failed to initialize Kakao Maps - " + (error as Error).message));
          }
        } else {
          console.error("[Kakao Maps] SDK loaded but kakao.maps is undefined");
          console.error("[Kakao Maps] window.kakao:", window.kakao);
          console.error("[Kakao Maps] API Key used:", apiKey.substring(0, 10) + '...');
          console.error("[Kakao Maps] API Key length:", apiKey.length);
          console.error("[Kakao Maps] Platform:", navigator.userAgent);
          console.error("[Kakao Maps] Possible issues:");
          console.error("  1. Wrong API key type - JavaScript SDK requires JavaScript Key (not Native App Key)");
          console.error("  2. Domain not registered in Kakao Developer Console");
          console.error("  3. API key not activated or expired");
          console.error("  4. Check: https://developers.kakao.com > 내 애플리케이션 > 앱 키 > JavaScript 키");
          reject(new Error("Kakao Maps SDK loaded but kakao.maps is undefined - API 키 타입(JavaScript 키 필요) 또는 도메인 설정을 확인해주세요."));
        }
      }, 100);
    };
    
    script.onerror = (error) => {
      clearTimeout(timeout);
      const errorMsg = "Failed to load Kakao Maps SDK - API 키, 도메인 설정, 또는 네트워크 연결을 확인해주세요.";
      console.error("[Kakao Maps]", errorMsg, error);
      console.error("[Kakao Maps] API Key used:", apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET');
      console.error("[Kakao Maps] API Key length:", apiKey?.length || 0);
      console.error("[Kakao Maps] Script URL:", script.src);
      console.error("[Kakao Maps] Platform:", navigator.userAgent);
      console.error("[Kakao Maps] Troubleshooting:");
      console.error("  1. Check if JavaScript Key (not Native App Key) is used");
      console.error("  2. Verify domain is registered in Kakao Developer Console");
      console.error("  3. Check network connection and CORS settings");
      console.error("  4. Visit: https://developers.kakao.com > 내 애플리케이션 > 플랫폼 설정");
      reject(new Error(errorMsg));
    };
    
    // 네이티브 앱에서도 제대로 작동하도록 설정
    script.async = true;
    script.defer = false;
    
    document.head.appendChild(script);
  });
}
