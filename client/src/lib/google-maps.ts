import { Loader } from "@googlemaps/js-api-loader";

let googleMapsLoader: Loader | null = null;
let googleMapsPromise: Promise<any> | null = null;

export async function loadGoogleMaps(): Promise<any> {
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error("Google Maps API key is not configured");
  }

  googleMapsLoader = new Loader({
    apiKey,
    version: "weekly",
    libraries: ["places", "geometry"],
  });

  googleMapsPromise = googleMapsLoader.importLibrary('maps').then(() => window.google);
  
  return googleMapsPromise;
}
