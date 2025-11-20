/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from "react";
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
import { Navigation, Search, X, Send, Filter, Users, User, Lock, Unlock } from "lucide-react";
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
  groups?: GroupWithMembers[];
  selectedMarkerIcons?: string[];
  selectedGroupIds?: string[];
  onMarkerIconsChange?: (icons: string[]) => void;
  onGroupIdsChange?: (groupIds: string[]) => void;
}

const PERSONAL_MEMO_COLOR = '#9333ea';

interface MarkerData {
  marker: google.maps.Marker;
  memoIds: string[];
}

export function GoogleMapView({ 
  onLocationSelect, 
  memos, 
  onMarkerClick, 
  onClusterClick, 
  userLocation, 
  onMapReady,
  onMyLocationClick,
  groups = [],
  selectedMarkerIcons = ["all"],
  selectedGroupIds = ["all"],
  onMarkerIconsChange,
  onGroupIdsChange,
}: GoogleMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const [userMarker, setUserMarker] = useState<google.maps.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationLocked, setIsLocationLocked] = useState(true);
  const [isMapLocked, setIsMapLocked] = useState(false);
  const [isMarkerFilterOpen, setIsMarkerFilterOpen] = useState(false);
  const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const watchIdRef = useRef<number | null>(null);

  // Initialize Google Map
  useEffect(() => {
    if (!mapRef.current) return;

    loadGoogleMaps()
      .then((google) => {
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

      // Try to get high-precision GPS location
      if (navigator.geolocation) {
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
      console.error("Failed to load Google Maps:", error);
      console.error("Error type:", typeof error);
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);
      console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      toast({
        title: "Google Maps Error",
        description: error?.message || "Failed to load Google Maps. Please check your API key and billing settings.",
        variant: "destructive",
      });
    });
  }, []);

  // Watch user location
  useEffect(() => {
    if (!map || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentUserLocation({ lat, lng });
        
        if (isLocationLocked) {
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
  }, [map, isLocationLocked, onMyLocationClick]);

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
      // Create user location marker with custom blue dot icon
      const marker = new google.maps.Marker({
        map,
        position: { lat: currentUserLocation.lat, lng: currentUserLocation.lng },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        zIndex: 1000,
      });

      setUserMarker(marker);

      return () => {
        marker.setMap(null);
      };
    });
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

        const existingMarker = currentMarkers.get(key);
        
        if (existingMarker) {
          // Update existing marker - remove old listeners first
          google.maps.event.clearInstanceListeners(existingMarker);
          
          existingMarker.setPosition({ lat: firstMemo.latitude, lng: firstMemo.longitude });
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
          existingMarker.setLabel(count > 1 ? {
            text: count.toString(),
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 'bold',
          } : null);
          
          // Re-add click listener
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

          currentMarkers.set(key, marker);
        }
      });

      // Remove markers that are no longer needed
      currentMarkers.forEach((marker, key) => {
        if (!newMarkerKeys.has(key)) {
          marker.setMap(null);
          currentMarkers.delete(key);
        }
      });
    });

    // Cleanup on unmount
    return () => {
      markersRef.current.forEach((marker) => {
        marker.setMap(null);
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
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address: searchQuery });

      if (result.results[0]) {
        const location = result.results[0].geometry.location;
        map.setCenter(location);
        map.setZoom(16);
        
        toast({
          title: "검색 완료",
          description: `"${searchQuery}" 위치로 이동했습니다`,
        });
        
        setSearchQuery("");
      } else {
        toast({
          title: "검색 실패",
          description: "주소를 찾을 수 없습니다",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast({
        title: "검색 오류",
        description: "주소 검색 중 오류가 발생했습니다. Geocoding API를 활성화해주세요.",
        variant: "destructive",
      });
    } finally {
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
      title: newLockState ? "확대/축소 잠금" : "확대/축소 잠금 해제",
      description: newLockState 
        ? "지도 확대/축소가 비활성화되었습니다" 
        : "지도를 자유롭게 확대/축소할 수 있습니다",
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
            title: "위치 정보 오류",
            description: "현재 위치를 가져올 수 없습니다",
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
      <div ref={mapRef} className="w-full h-full" data-testid="map-container" />
      
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
            <DialogTitle>마커 필터</DialogTitle>
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
            <DialogTitle>그룹 필터</DialogTitle>
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
                  title: newLockState ? "위치 고정" : "위치 고정 해제",
                  description: newLockState 
                    ? "내 위치가 화면 중앙에 고정되며, 지도가 따라 움직입니다" 
                    : "지도를 자유롭게 이동할 수 있습니다",
                });
              }}
              className={`h-10 w-10 rounded-lg shadow-lg transition-all hover:shadow-2xl ${
                isLocationLocked 
                  ? 'bg-blue-500 hover:bg-blue-600 border-2 border-blue-500' 
                  : 'bg-muted hover:bg-muted/80 border-2 border-border'
              }`}
              data-testid="button-location-lock"
            >
              <User className={`h-5 w-5 ${isLocationLocked ? 'text-white' : 'text-muted-foreground'}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{isLocationLocked ? "위치 고정 해제" : "위치 고정"}</p>
          </TooltipContent>
        </Tooltip>

        {/* GPS 위치 이동 버튼 (위치 고정 모드가 아닐 때만 표시) */}
        {!isLocationLocked && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="h-10 w-10 rounded-lg shadow-lg bg-primary hover:bg-primary/90 border-2 border-primary hover:shadow-2xl transition-all"
                onClick={handleMyLocation}
                data-testid="button-my-location"
              >
                <Navigation className="h-5 w-5 text-primary-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>내 위치로 이동</p>
            </TooltipContent>
          </Tooltip>
        )}

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
            <p>그룹 필터</p>
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
            <p>카테고리 필터</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
