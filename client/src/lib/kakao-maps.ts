export function loadKakaoMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps) {
      resolve();
      return;
    }

    const apiKey = import.meta.env.VITE_KAKAO_API_KEY;
    console.log("Kakao API Key from env:", apiKey);
    console.log("All env vars:", import.meta.env);
    
    if (!apiKey) {
      console.warn("Kakao Maps API key not configured. Map features will be disabled.");
      reject(new Error("Kakao Maps API key not configured"));
      return;
    }

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;
    console.log("Loading Kakao Maps from:", script.src);
    
    script.onload = () => {
      console.log("Kakao Maps script loaded successfully");
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          console.log("Kakao Maps initialized");
          resolve();
        });
      } else {
        console.error("Kakao Maps object not found after script load");
        reject(new Error("Kakao Maps SDK loaded but kakao.maps is undefined"));
      }
    };
    
    script.onerror = (error) => {
      console.error("Failed to load Kakao Maps SDK script:", error);
      reject(new Error("Failed to load Kakao Maps SDK - check API key permissions in Kakao Developers console"));
    };
    
    document.head.appendChild(script);
  });
}
