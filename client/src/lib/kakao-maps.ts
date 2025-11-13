export function loadKakaoMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps) {
      resolve();
      return;
    }

    const apiKey = import.meta.env.VITE_KAKAO_API_KEY;
    
    if (!apiKey) {
      console.warn("Kakao Maps API key not configured. Map features will be disabled.");
      reject(new Error("Kakao Maps API key not configured"));
      return;
    }

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;
    
    script.onload = () => {
      window.kakao.maps.load(() => {
        resolve();
      });
    };
    
    script.onerror = () => {
      reject(new Error("Failed to load Kakao Maps SDK"));
    };
    
    document.head.appendChild(script);
  });
}
