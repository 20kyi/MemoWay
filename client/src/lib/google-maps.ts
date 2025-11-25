declare global {
  interface Window {
    google: any;
  }
}

let googleMapsPromise: Promise<any> | null = null;
let errorShown = false; // 에러 메시지 중복 표시 방지

export async function loadGoogleMaps(): Promise<any> {
  // 이미 로드된 경우 재사용
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  // 디버깅: 환경 변수 로드 확인
  if (import.meta.env.DEV) {
    console.log("🔍 Google Maps 환경 변수 확인:", {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + "..." : "없음",
      allEnvKeys: Object.keys(import.meta.env).filter(key => key.startsWith("VITE_"))
    });
  }
  
  if (!apiKey) {
    // 에러를 한 번만 표시
    if (!errorShown) {
      errorShown = true;
      console.error("Google Maps Error: VITE_GOOGLE_MAPS_API_KEY is not configured. Google Maps features will be unavailable.");
      console.error("사용 가능한 VITE_ 환경 변수:", Object.keys(import.meta.env).filter(key => key.startsWith("VITE_")));
    }
    const error = new Error("Google Maps API key is not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your environment variables.");
    throw error;
  }

  console.log("Loading Google Maps with API key:", apiKey.substring(0, 20) + "...");

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      console.log("Google Maps already loaded");
      resolve(window.google);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker&v=weekly`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log("Google Maps script loaded successfully");
      if (window.google && window.google.maps) {
        console.log("Google Maps API is ready");
        resolve(window.google);
      } else {
        const error = new Error("Google Maps loaded but API is not available");
        console.error(error.message);
        reject(error);
      }
    };

    script.onerror = (event) => {
      const error = new Error("Failed to load Google Maps script. Please check: 1) API key is valid, 2) Maps JavaScript API is enabled in Google Cloud Console, 3) Billing is enabled");
      console.error("Google Maps script error:", error.message);
      console.error("Error event:", event);
      reject(error);
    };

    document.head.appendChild(script);
    console.log("Google Maps script added to document");
  });
  
  return googleMapsPromise;
}
