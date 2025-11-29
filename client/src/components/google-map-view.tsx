/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, X, Filter, Users, User, Lock, Unlock, Edit, Trash2, Plus } from "lucide-react";
import { loadGoogleMaps } from "@/lib/google-maps";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import type { MemoWithDetails, GroupWithMembers } from "@shared/schema";

interface GoogleMapViewProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string; buildingName: string }) => void;
  memos: MemoWithDetails[];
  onMarkerClick: (memoId: string) => void;
  onClusterClick?: (memoIds: string[]) => void;
  userLocation: { lat: number; lng: number } | null;
  onMapReady?: (map: any) => void;
  onMyLocationClick?: (location: { lat: number; lng: number }) => void;
  pendingLocation?: { lat: number; lng: number } | null;
  groups?: GroupWithMembers[];
  selectedMarkerIcons?: string[];
  selectedGroupIds?: string[];
  onMarkerIconsChange?: (icons: string[]) => void;
  onGroupIdsChange?: (groupIds: string[]) => void;
  selectedMemo?: MemoWithDetails | null;
  memoDetailOpen?: boolean;
  onEditMemo?: (memoId: string) => void;
  onDeleteMemo?: (memoId: string) => void;
  onAddNewMemo?: (location: { lat: number; lng: number; address: string; buildingName: string }) => void;
}

const PERSONAL_MEMO_COLOR = '#9333ea';

interface MarkerData {
  marker: google.maps.Marker;
  memoIds: string[];
  color: string;
  count: number;
}

function GoogleMapViewComponent({ 
  onLocationSelect, 
  memos, 
  onMarkerClick, 
  onClusterClick, 
  userLocation, 
  onMapReady,
  onMyLocationClick,
  pendingLocation,
  groups = [],
  selectedMarkerIcons = ["all"],
  selectedGroupIds = ["all"],
  onMarkerIconsChange,
  onGroupIdsChange,
  selectedMemo = null,
  memoDetailOpen = false,
  onEditMemo,
  onDeleteMemo,
  onAddNewMemo,
}: GoogleMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerData>>(new Map());
  const [userMarker, setUserMarker] = useState<google.maps.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationLocked, setIsLocationLocked] = useState(true);
  const [isMapLocked, setIsMapLocked] = useState(false);
  const [isMarkerFilterOpen, setIsMarkerFilterOpen] = useState(false);
  const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const errorToastShownRef = useRef(false); // 토스트 중복 표시 방지
  const { toast } = useToast();
  const { t } = useLanguage();
  const watchIdRef = useRef<number | null>(null);

  // Initialize Google Map
  useEffect(() => {
    if (!mapRef.current) return;
    
    // 에러 상태 초기화
    setMapError(null);

    loadGoogleMaps()
      .then((google) => {
        // 성공 시 에러 상태 제거
        setMapError(null);
        errorToastShownRef.current = false;
        
        const mapInstance = new google.maps.Map(mapRef.current!, {
          center: { lat: 37.5665, lng: 126.9780 }, // Seoul
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
        });

        setMap(mapInstance);

        if (onMapReady) {
          onMapReady(mapInstance);
        }

      // Map click handler
      mapInstance.addListener("click", async (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;

        const lat = e.latLng.lat();
        const lng = e.latLng.lng();

        // Geocode to get address
        const geocoder = new google.maps.Geocoder();
        try {
          const result = await geocoder.geocode({ location: { lat, lng } });
          if (result.results[0]) {
            const address = result.results[0].formatted_address;
            const buildingName = result.results[0].address_components[0]?.long_name || '';
            onLocationSelect({ lat, lng, address, buildingName });
          } else {
            onLocationSelect({
              lat,
              lng,
              address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              buildingName: t.common.addressSearchPlaceholder,
            });
          }
        } catch (error) {
          console.error("Geocoding error:", error);
          onLocationSelect({
            lat,
            lng,
            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            buildingName: t.common.addressSearchPlaceholder,
          });
        }
      });

      // Disable location lock on drag
      mapInstance.addListener("dragstart", () => {
        if (isLocationLocked) {
          setIsLocationLocked(false);
        }
      });

      // Disable location lock on zoom
      mapInstance.addListener("zoom_changed", () => {
        if (isLocationLocked) {
          setIsLocationLocked(false);
        }
      });

      // Try to get high-precision GPS location (only if no pendingLocation)
      if (navigator.geolocation && !pendingLocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            mapInstance.setCenter({ lat, lng });
            mapInstance.setZoom(15);
          },
          (error) => {
            console.log("GPS error:", error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      }
    }).catch((error) => {
      const errorMessage = error?.message || "Failed to load Google Maps. Please check your API key and billing settings.";
      
      // 에러 상태 저장
      setMapError(errorMessage);
      
      // 콘솔 에러는 한 번만 출력 (중복 방지)
      if (!errorToastShownRef.current) {
        console.error("Failed to load Google Maps:", errorMessage);
        
        // 사용자에게 토스트는 한 번만 표시
        errorToastShownRef.current = true;
        toast({
          title: t.toast.googleMapsLoadFailed,
          description: t.toast.googleMapsLoadFailedDesc,
          variant: "destructive",
          duration: 3000, // 3초간 표시
        });
      }
    });
  }, [toast]);

  // Watch user location
  useEffect(() => {
    if (!map || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentUserLocation({ lat, lng });
        
        // pendingLocation이 있으면 자동 위치 이동을 막음
        if (isLocationLocked && !pendingLocation) {
          map.panTo({ lat, lng });
        }
        
        if (onMyLocationClick) {
          onMyLocationClick({ lat, lng });
        }
      },
      (error) => {
        console.log("Location tracking error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [map, isLocationLocked, onMyLocationClick, pendingLocation]);

  // pendingLocation이 처리되면 위치 고정 모드 해제
  useEffect(() => {
    if (pendingLocation && isLocationLocked) {
      setIsLocationLocked(false);
    }
  }, [pendingLocation, isLocationLocked]);

  // Update user marker (only when location is NOT locked)
  useEffect(() => {
    if (!map || !currentUserLocation || isLocationLocked) {
      if (userMarker) {
        userMarker.setMap(null);
        setUserMarker(null);
      }
      return;
    }

    loadGoogleMaps().then((google) => {
      // Remove old marker if exists
      if (userMarker) {
        userMarker.setMap(null);
      }

      // Create user location marker with User icon (same as Kakao Map)
      const marker = new google.maps.Marker({
        map,
        position: { lat: currentUserLocation.lat, lng: currentUserLocation.lng },
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="16" fill="#3b82f6"/>
              <circle cx="16" cy="16" r="14" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
              <g transform="translate(7, 7)">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="7" r="4" fill="none" stroke="#ffffff" stroke-width="2.5"/>
              </g>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        },
        zIndex: 1000,
      });

      setUserMarker(marker);
    });

    return () => {
      if (userMarker) {
        userMarker.setMap(null);
      }
    };
  }, [map, currentUserLocation, isLocationLocked]);

  // Update markers based on memos
  useEffect(() => {
    if (!map) return;

    // Filter memos
    const filteredMemos = memos.filter(memo => {
      const iconMatch = selectedMarkerIcons.includes("all") || selectedMarkerIcons.includes(memo.markerIcon);
      const groupMatch = selectedGroupIds.includes("all") || 
                        (memo.groupId ? selectedGroupIds.includes(memo.groupId) : selectedGroupIds.includes("personal"));
      return iconMatch && groupMatch;
    });

    // Group memos by location
    const grouped = new Map<string, MemoWithDetails[]>();
    filteredMemos.forEach(memo => {
      const key = `${memo.latitude.toFixed(6)},${memo.longitude.toFixed(6)}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(memo);
    });

    loadGoogleMaps().then((google) => {
      const currentMarkers = markersRef.current;
      const newMarkerKeys = new Set<string>();

      grouped.forEach((clusterMemos, key) => {
        newMarkerKeys.add(key);
        
        const firstMemo = clusterMemos[0];
        const count = clusterMemos.length;

        // Determine marker color
        let markerColor = PERSONAL_MEMO_COLOR;
        if (firstMemo.groupId) {
          const group = groups.find(g => g.id === firstMemo.groupId);
          markerColor = group?.color || PERSONAL_MEMO_COLOR;
        }

        const existingMarkerData = currentMarkers.get(key);
        
        if (existingMarkerData) {
          const existingMarker = existingMarkerData.marker;
          const colorChanged = existingMarkerData.color !== markerColor;
          const countChanged = existingMarkerData.count !== count;
          
          // Only update icon if color or count changed (to prevent flickering)
          if (colorChanged || countChanged) {
            existingMarker.setIcon(count > 1 ? {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 20,
              fillColor: markerColor,
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            } : {
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25C30 6.716 23.284 0 15 0z" 
                        fill="${markerColor}" 
                        stroke="#ffffff" 
                        stroke-width="2"/>
                  <circle cx="15" cy="15" r="8" fill="#ffffff"/>
                </svg>
              `)}`,
              scaledSize: new google.maps.Size(30, 40),
              anchor: new google.maps.Point(15, 40),
            });
          }
          
          // Only update label if count changed
          if (countChanged) {
            existingMarker.setLabel(count > 1 ? {
              text: count.toString(),
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 'bold',
            } : null);
          }
          
          // Update stored data
          existingMarkerData.color = markerColor;
          existingMarkerData.count = count;
          existingMarkerData.memoIds = clusterMemos.map(m => m.id);
          
          // Re-add click listener (always update this to ensure correct callback)
          google.maps.event.clearInstanceListeners(existingMarker);
          existingMarker.addListener('click', () => {
            if (count > 1 && onClusterClick) {
              onClusterClick(clusterMemos.map(m => m.id));
            } else {
              onMarkerClick(firstMemo.id);
            }
          });
        } else {
          // Create new marker
          const marker = new google.maps.Marker({
            map,
            position: { lat: firstMemo.latitude, lng: firstMemo.longitude },
            icon: count > 1 ? {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 20,
              fillColor: markerColor,
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            } : {
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25C30 6.716 23.284 0 15 0z" 
                        fill="${markerColor}" 
                        stroke="#ffffff" 
                        stroke-width="2"/>
                  <circle cx="15" cy="15" r="8" fill="#ffffff"/>
                </svg>
              `)}`,
              scaledSize: new google.maps.Size(30, 40),
              anchor: new google.maps.Point(15, 40),
            },
            label: count > 1 ? {
              text: count.toString(),
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 'bold',
            } : undefined,
          });

          marker.addListener('click', () => {
            if (count > 1 && onClusterClick) {
              onClusterClick(clusterMemos.map(m => m.id));
            } else {
              onMarkerClick(firstMemo.id);
            }
          });

          currentMarkers.set(key, {
            marker,
            memoIds: clusterMemos.map(m => m.id),
            color: markerColor,
            count,
          });
        }
      });

      // Remove markers that are no longer needed
      currentMarkers.forEach((markerData, key) => {
        if (!newMarkerKeys.has(key)) {
          markerData.marker.setMap(null);
          currentMarkers.delete(key);
        }
      });
    });

    // Cleanup on unmount
    return () => {
      markersRef.current.forEach((markerData) => {
        markerData.marker.setMap(null);
      });
      markersRef.current.clear();
    };
  }, [map, memos, groups, selectedMarkerIcons, selectedGroupIds, onMarkerClick, onClusterClick]);

  // Address search
  const handleSearch = async () => {
    if (!map || !searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    try {
      const google = await loadGoogleMaps();
      
      // 방법 2: Geocoder API 폴백 함수 정의
      const fallbackToGeocoder = () => {
        try {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ address: searchQuery }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
              const location = results[0].geometry.location;
              map.setCenter(location);
              map.setZoom(16);
              
              toast({
                title: t.toast.searchComplete,
                description: t.toast.locationMoveComplete.replace('{query}', searchQuery),
              });
              
              setSearchQuery("");
            } else {
              // Geocoder도 실패한 경우
              let errorMessage = "주소를 찾을 수 없습니다";
              if (status === google.maps.GeocoderStatus.ZERO_RESULTS) {
                errorMessage = "검색 결과가 없습니다. 다른 키워드로 시도해주세요.";
              } else if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
                errorMessage = "검색 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.";
              } else if (status === google.maps.GeocoderStatus.REQUEST_DENIED) {
                errorMessage = "검색 요청이 거부되었습니다. Google Cloud Console에서 Geocoding API와 Places API를 활성화해주세요.";
              } else if (status === google.maps.GeocoderStatus.INVALID_REQUEST) {
                errorMessage = "검색어가 올바르지 않습니다.";
              }
              
              toast({
                title: t.toast.searchFailed,
                description: errorMessage || t.toast.searchFailedDesc,
                variant: "destructive",
              });
            }
            setIsSearching(false);
          });
        } catch (geocoderError) {
          console.error("Geocoding error:", geocoderError);
          toast({
            title: t.toast.searchError,
            description: t.toast.searchErrorPlaces,
            variant: "destructive",
          });
          setIsSearching(false);
        }
      };
      
      // 방법 1: Places API 사용 (더 정확하고 권장되는 방법)
      try {
        if (google.maps.places && google.maps.places.PlacesService) {
          const placesService = new google.maps.places.PlacesService(map);
          const request = {
            query: searchQuery,
            fields: ['geometry', 'formatted_address', 'name'],
          };

          // Places API의 findPlaceFromQuery 사용
          placesService.findPlaceFromQuery(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
              const place = results[0];
              if (place.geometry && place.geometry.location) {
                const location = place.geometry.location;
                map.setCenter(location);
                map.setZoom(16);
                
                toast({
                  title: t.toast.searchComplete,
                  description: t.toast.locationMoveComplete.replace('{query}', place.name || searchQuery),
                });
                
                setSearchQuery("");
                setIsSearching(false);
                return;
              }
            }
            
            // Places API 실패 시 Geocoder로 폴백
            fallbackToGeocoder();
          });
        } else {
          // Places API가 사용 불가능한 경우 바로 Geocoder 사용
          console.warn("Places API not available, using Geocoder");
          fallbackToGeocoder();
        }
      } catch (placesError) {
        console.warn("Places API error, falling back to Geocoder:", placesError);
        // Places API 실패 시 Geocoder로 폴백
        fallbackToGeocoder();
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: t.toast.searchError,
        description: t.toast.searchErrorDesc,
        variant: "destructive",
      });
      setIsSearching(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const toggleMapLock = () => {
    const newLockState = !isMapLocked;
    setIsMapLocked(newLockState);
    
    if (map) {
      map.setOptions({
        gestureHandling: newLockState ? 'none' : 'greedy',
        zoomControl: false,
      });
    }
    
    toast({
      title: newLockState ? t.toast.zoomLockEnabled : t.toast.zoomLockDisabled,
      description: newLockState 
        ? t.toast.zoomLockEnabledDesc
        : t.toast.zoomLockDisabledDesc,
    });
  };

  const handleMyLocation = () => {
    if (navigator.geolocation && map) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          map.setCenter({ lat, lng });
          map.setZoom(15);
          
          if (onMyLocationClick) {
            onMyLocationClick({ lat, lng });
          }
        },
        (error) => {
          console.error("Location error:", error);
          toast({
            title: t.toast.locationError,
            description: t.toast.currentLocationError,
            variant: "destructive"
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }
  };

  return (
    <div className="relative w-full h-full">
      {mapError ? (
        <div className="w-full h-full flex items-center justify-center bg-muted p-8 text-center">
          <div className="max-w-md">
            <h3 className="text-lg font-semibold mb-2 text-destructive">Google Maps를 불러올 수 없습니다</h3>
            <p className="text-muted-foreground mb-4">{mapError}</p>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>해결 방법:</strong></p>
              <ol className="list-decimal list-inside space-y-1 text-left">
                <li>프로젝트 루트에 <code className="bg-muted px-1 rounded">.env</code> 파일 생성</li>
                <li><code className="bg-muted px-1 rounded">VITE_GOOGLE_MAPS_API_KEY=your_api_key</code> 추가</li>
                <li>서버 재시작</li>
                <li>또는 카카오맵 사용 (설정에서 변경 가능)</li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <div ref={mapRef} className="w-full h-full" data-testid="map-container" />
      )}
      
      {/* 위치 고정 모드 상태 배너 */}
      {isLocationLocked && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none max-w-[calc(100vw-2rem)] px-2">
          <div className="bg-blue-500/90 backdrop-blur-sm text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg border-2 border-blue-400 flex items-center gap-1.5 sm:gap-2 animate-pulse">
            <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium leading-tight whitespace-normal text-center">{t.common.locationLockModeActive}</span>
          </div>
        </div>
      )}
      
      {/* Fixed center marker (location lock mode) */}
      {isLocationLocked && currentUserLocation && (
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-40"
          style={{ marginTop: '-16px' }}
        >
          <div style={{
            position: 'relative',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#3b82f6',
            borderRadius: '50%',
            border: '2px solid #ffffff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}>
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      )}

      {/* 주소 검색 바 */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="flex gap-2 bg-card/80 backdrop-blur-sm rounded-3xl shadow-lg border-2 border-primary/30 p-2">
          <div className="relative flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              placeholder={t.common.addressSearchPlaceholder}
              className="pr-10 border-0 focus-visible:ring-0"
              disabled={isSearching}
              data-testid="input-address-search"
            />
            {searchQuery && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={handleClearSearch}
                data-testid="button-clear-search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            size="icon"
            onClick={handleSearch}
            disabled={!searchQuery.trim() || isSearching}
            className="h-10 w-10 flex-shrink-0"
            data-testid="button-search-address"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Marker Filter Dialog */}
      <Dialog open={isMarkerFilterOpen} onOpenChange={setIsMarkerFilterOpen}>
        <DialogContent className="rounded-3xl max-h-[85vh] flex flex-col" data-testid="dialog-marker-filter">
          <DialogHeader>
            <DialogTitle>{t.common.markerFilter}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 overflow-y-auto">
            {["all", "default", "travel", "love", "food", "cafe", "shopping", "sport", "work"].map((icon) => (
              <div key={icon} className="flex items-center space-x-2">
                <Checkbox
                  id={`marker-${icon}`}
                  checked={selectedMarkerIcons.includes(icon)}
                  onCheckedChange={(checked) => {
                    if (onMarkerIconsChange) {
                      if (icon === "all") {
                        onMarkerIconsChange(checked ? ["all"] : []);
                      } else {
                        const newIcons = checked
                          ? [...selectedMarkerIcons.filter(i => i !== "all"), icon]
                          : selectedMarkerIcons.filter(i => i !== icon);
                        onMarkerIconsChange(newIcons.length === 0 ? ["all"] : newIcons);
                      }
                    }
                  }}
                  data-testid={`checkbox-marker-${icon}`}
                />
                <label htmlFor={`marker-${icon}`} className="cursor-pointer">
                  {t.categories[icon as keyof typeof t.categories]}
                </label>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Filter Dialog */}
      <Dialog open={isGroupFilterOpen} onOpenChange={setIsGroupFilterOpen}>
        <DialogContent className="rounded-3xl max-h-[85vh] flex flex-col" data-testid="dialog-group-filter">
          <DialogHeader>
            <DialogTitle>{t.common.groupFilter}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 overflow-y-auto">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="group-all"
                checked={selectedGroupIds.includes("all")}
                onCheckedChange={(checked) => {
                  if (onGroupIdsChange) {
                    onGroupIdsChange(checked ? ["all"] : []);
                  }
                }}
                data-testid="checkbox-group-all"
              />
              <label htmlFor="group-all" className="cursor-pointer">
                {t.categories.all}
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="group-personal"
                checked={selectedGroupIds.includes("personal")}
                onCheckedChange={(checked) => {
                  if (onGroupIdsChange) {
                    const newIds = checked
                      ? [...selectedGroupIds.filter(i => i !== "all"), "personal"]
                      : selectedGroupIds.filter(i => i !== "personal");
                    onGroupIdsChange(newIds.length === 0 ? ["all"] : newIds);
                  }
                }}
                data-testid="checkbox-group-personal"
              />
              <label htmlFor="group-personal" className="cursor-pointer">
                {t.common.personal}
              </label>
            </div>
            {groups.map((group) => (
              <div key={group.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`group-${group.id}`}
                  checked={selectedGroupIds.includes(group.id)}
                  onCheckedChange={(checked) => {
                    if (onGroupIdsChange) {
                      const newIds = checked
                        ? [...selectedGroupIds.filter(i => i !== "all"), group.id]
                        : selectedGroupIds.filter(i => i !== group.id);
                      onGroupIdsChange(newIds.length === 0 ? ["all"] : newIds);
                    }
                  }}
                  data-testid={`checkbox-group-${group.id}`}
                />
                <label htmlFor={`group-${group.id}`} className="cursor-pointer flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                  {group.name}
                </label>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

        {/* 플로팅 필터 버튼들 (오른쪽 하단) */}
        <div className="fixed bottom-20 right-4 flex flex-col gap-2 z-50">
        {/* 지도 확대/축소 잠금 버튼 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              onClick={toggleMapLock}
              className={`h-10 w-10 rounded-lg shadow-lg transition-all hover:shadow-2xl ${
                isMapLocked 
                  ? 'bg-destructive hover:bg-destructive/90 border-2 border-destructive' 
                  : 'bg-primary hover:bg-primary/90 border-2 border-primary'
              }`}
              data-testid="button-map-lock"
            >
              {isMapLocked ? (
                <Lock className="h-5 w-5 text-primary-foreground" />
              ) : (
                <Unlock className="h-5 w-5 text-primary-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{isMapLocked ? "확대/축소 잠금 해제" : "확대/축소 잠금"}</p>
          </TooltipContent>
        </Tooltip>

        {/* 위치 고정 버튼 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              onClick={() => {
                const newLockState = !isLocationLocked;
                setIsLocationLocked(newLockState);
                
                if (newLockState && map && currentUserLocation) {
                  map.panTo(currentUserLocation);
                }
                
                toast({
                  title: newLockState ? t.toast.locationLockEnabled : t.toast.locationLockDisabled,
                  description: newLockState 
                    ? t.toast.locationLockEnabledDesc
                    : t.toast.locationLockDisabledDesc,
                });
              }}
              className={`h-10 w-10 rounded-lg shadow-lg transition-all hover:shadow-2xl relative ${
                isLocationLocked 
                  ? 'bg-blue-500 hover:bg-blue-600 border-2 border-blue-500' 
                  : 'bg-muted hover:bg-muted/80 border-2 border-border'
              }`}
              data-testid="button-location-lock"
            >
              {isLocationLocked ? (
                <Lock className="h-5 w-5 text-white" />
              ) : (
                <Unlock className="h-5 w-5 text-muted-foreground" />
              )}
              {/* 상태 표시 점 */}
              {isLocationLocked && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 border-2 border-white rounded-full animate-pulse" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-medium">{isLocationLocked ? "위치 고정 해제" : "위치 고정"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isLocationLocked 
                ? "내 위치가 화면 중앙에 고정됩니다" 
                : "내 위치를 화면 중앙에 고정합니다"}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* 그룹 필터 버튼 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              className={`h-10 w-10 rounded-lg shadow-lg relative overflow-visible transition-all hover:shadow-2xl ${
                selectedGroupIds.includes("all") ? 'bg-primary hover:bg-primary/90 border-2 border-primary' : ''
              }`}
              onClick={() => setIsGroupFilterOpen(true)}
              data-testid="button-group-filter"
              style={(() => {
                if (selectedGroupIds.includes("all")) return {};
                
                const colors: string[] = [];
                selectedGroupIds.forEach(id => {
                  if (id === "personal") {
                    colors.push(PERSONAL_MEMO_COLOR);
                  } else {
                    const group = groups.find(g => g.id === id);
                    if (group) colors.push(group.color);
                  }
                });

                if (colors.length === 0) return {};
                if (colors.length === 1) {
                  return { backgroundColor: colors[0], borderColor: colors[0] };
                }

                const step = 100 / colors.length;
                const gradientStops = colors.map((color, index) => {
                  const start = index * step;
                  const end = (index + 1) * step;
                  return `${color} ${start}%, ${color} ${end}%`;
                }).join(', ');

                return {
                  background: `linear-gradient(135deg, ${gradientStops})`,
                  borderColor: colors[0]
                };
              })()}
            >
              <Users className={`h-5 w-5 ${
                selectedGroupIds.includes("all") ? 'text-primary-foreground' : ''
              }`} style={{
                color: selectedGroupIds.includes("all") ? undefined : 'white',
                filter: selectedGroupIds.includes("all") ? undefined : 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
              }} />
              {!selectedGroupIds.includes("all") && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] bg-white text-black border-2 border-white"
                  data-testid="badge-group-filter-count"
                >
                  {selectedGroupIds.filter(id => id !== "all").length}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{t.common.groupFilter}</p>
          </TooltipContent>
        </Tooltip>

        {/* 마커 필터 버튼 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              className="h-10 w-10 rounded-lg shadow-lg relative bg-primary hover:bg-primary/90 border-2 border-primary hover:shadow-2xl transition-all"
              onClick={() => setIsMarkerFilterOpen(true)}
              data-testid="button-marker-filter"
            >
              <Filter className="h-5 w-5 text-primary-foreground" />
              {!selectedMarkerIcons.includes("all") && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]"
                  data-testid="badge-marker-filter-count"
                >
                  {selectedMarkerIcons.filter(icon => icon !== "all").length}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{t.common.markerFilter}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// React.memo로 메모이제이션하여 불필요한 리렌더링 방지
export const GoogleMapView = memo(GoogleMapViewComponent);
