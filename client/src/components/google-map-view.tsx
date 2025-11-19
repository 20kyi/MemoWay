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
  marker: google.maps.marker.AdvancedMarkerElement;
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
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [userMarker, setUserMarker] = useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationLocked, setIsLocationLocked] = useState(true);
  const [isMarkerFilterOpen, setIsMarkerFilterOpen] = useState(false);
  const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const watchIdRef = useRef<number | null>(null);

  // Initialize Google Map
  useEffect(() => {
    if (!mapRef.current) return;

    loadGoogleMaps().then((google) => {
      const mapInstance = new google.maps.Map(mapRef.current!, {
        center: { lat: 37.5665, lng: 126.9780 }, // Seoul
        zoom: 15,
        mapId: "LOCATION_MEMO_MAP",
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
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
      toast({
        title: "Error",
        description: "Failed to load Google Maps. Please check your API key.",
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
        userMarker.map = null;
        setUserMarker(null);
      }
      return;
    }

    loadGoogleMaps().then((google) => {
      // Create user marker element
      const markerEl = document.createElement('div');
      markerEl.innerHTML = `
        <div style="
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #3b82f6;
          border-radius: 50%;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        ">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#ffffff" 
            stroke-width="2.5" 
            stroke-linecap="round" 
            stroke-linejoin="round"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
      `;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: currentUserLocation.lat, lng: currentUserLocation.lng },
        content: markerEl,
      });

      setUserMarker(marker);

      return () => {
        marker.map = null;
      };
    });
  }, [map, currentUserLocation, isLocationLocked]);

  // Update markers based on memos
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(({ marker }) => {
      marker.map = null;
    });

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
      const newMarkers: MarkerData[] = [];

      grouped.forEach((clusterMemos, key) => {
        const firstMemo = clusterMemos[0];
        const count = clusterMemos.length;

        // Determine marker color
        let markerColor = PERSONAL_MEMO_COLOR;
        if (firstMemo.groupId) {
          const group = groups.find(g => g.id === firstMemo.groupId);
          markerColor = group?.color || PERSONAL_MEMO_COLOR;
        }

        // Create marker element
        const markerEl = document.createElement('div');
        markerEl.style.position = 'relative';
        markerEl.style.cursor = 'pointer';
        
        if (count > 1) {
          // Cluster marker
          markerEl.innerHTML = `
            <div style="
              width: 40px;
              height: 40px;
              background-color: ${markerColor};
              border: 3px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 16px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ">
              ${count}
            </div>
          `;
        } else {
          // Single marker with icon/photo
          const photoUrl = firstMemo.photos?.[0]?.url;
          markerEl.innerHTML = `
            <div style="
              width: 30px;
              height: 40px;
            ">
              <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25C30 6.716 23.284 0 15 0z" 
                      fill="${markerColor}" 
                      stroke="#ffffff" 
                      stroke-width="2"/>
                ${photoUrl ? `
                  <circle cx="15" cy="15" r="8.5" fill="#ffffff"/>
                  <clipPath id="photo-clip-${key}">
                    <circle cx="15" cy="15" r="8"/>
                  </clipPath>
                  <image href="${photoUrl}" x="7" y="7" width="16" height="16" clip-path="url(#photo-clip-${key})" preserveAspectRatio="xMidYMid slice"/>
                ` : `
                  <circle cx="15" cy="15" r="8" fill="#ffffff"/>
                `}
              </svg>
            </div>
          `;
        }

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: firstMemo.latitude, lng: firstMemo.longitude },
          content: markerEl,
        });

        markerEl.addEventListener('click', () => {
          if (count > 1 && onClusterClick) {
            onClusterClick(clusterMemos.map(m => m.id));
          } else {
            onMarkerClick(firstMemo.id);
          }
        });

        newMarkers.push({
          marker,
          memoIds: clusterMemos.map(m => m.id),
        });
      });

      setMarkers(newMarkers);
    });

    return () => {
      markers.forEach(({ marker }) => {
        marker.map = null;
      });
    };
  }, [map, memos, groups, selectedMarkerIcons, selectedGroupIds, onMarkerClick, onClusterClick]);

  // Address search
  const handleSearch = async () => {
    if (!map || !searchQuery.trim()) return;

    try {
      const google = await loadGoogleMaps();
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address: searchQuery });

      if (result.results[0]) {
        const location = result.results[0].geometry.location;
        map.setCenter(location);
        map.setZoom(16);
        setIsSearchOpen(false);
        setSearchQuery("");
      } else {
        toast({
          title: t.common.addressSearchPlaceholder,
          description: "주소를 찾을 수 없습니다",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast({
        title: "Error",
        description: "주소 검색 중 오류가 발생했습니다",
        variant: "destructive",
      });
    }
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

      {/* Search Dialog */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="rounded-3xl" data-testid="dialog-search">
          <DialogHeader>
            <DialogTitle>{t.common.addressSearchPlaceholder}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              placeholder={t.common.addressSearchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              data-testid="input-search-address"
            />
            <Button onClick={handleSearch} data-testid="button-search">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Control Buttons */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        {/* Search Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              onClick={() => setIsSearchOpen(true)}
              className="h-10 w-10 rounded-lg shadow-lg bg-background hover:bg-background/90 border-2 border-primary hover:shadow-2xl transition-all"
              data-testid="button-search-open"
            >
              <Search className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>주소 검색</p>
          </TooltipContent>
        </Tooltip>

        {/* Location Lock Button */}
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
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-primary' 
                  : 'bg-background hover:bg-background/90 border-2 border-border'
              }`}
              data-testid="button-location-lock"
            >
              {isLocationLocked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{isLocationLocked ? "위치 고정 해제" : "위치 고정"}</p>
          </TooltipContent>
        </Tooltip>

        {/* My Location Button */}
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
      </div>

      {/* Filter Buttons (bottom-right) */}
      <div className="fixed bottom-20 right-4 flex flex-col gap-2 z-50">
        {/* Group Filter Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              onClick={() => setIsGroupFilterOpen(true)}
              className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90 relative"
              data-testid="button-group-filter"
            >
              <Users className="h-6 w-6 text-primary-foreground" />
              {!selectedGroupIds.includes("all") && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-red-500">
                  !
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>그룹 필터</p>
          </TooltipContent>
        </Tooltip>

        {/* Marker Filter Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              onClick={() => setIsMarkerFilterOpen(true)}
              className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90 relative"
              data-testid="button-marker-filter"
            >
              <Filter className="h-6 w-6 text-primary-foreground" />
              {!selectedMarkerIcons.includes("all") && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-red-500">
                  !
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>마커 필터</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
