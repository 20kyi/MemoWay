import type { MemoWithDetails } from "@shared/schema";

export type TabType = "map" | "memos" | "groups" | "profile";

export interface SelectedLocation {
  lat: number;
  lng: number;
  address: string;
  buildingName: string;
}

export interface UserLocation {
  lat: number;
  lng: number;
}

export interface PendingLocation {
  lat: number;
  lng: number;
}

export interface HomeState {
  activeTab: TabType;
  memoFormOpen: boolean;
  memoDetailOpen: boolean;
  memoClusterOpen: boolean;
  editingMemo: MemoWithDetails | null;
  selectedMemo: MemoWithDetails | null;
  clusterMemoIds: string[];
  selectedLocation: SelectedLocation | null;
  userLocation: UserLocation | null;
  notificationsEnabled: boolean;
  locationEnabled: boolean;
  proximityRadius: number;
  notifiedMemoIds: Set<string>;
  currentMemberId: string | null;
  personalMemberId: string | null;
  myMemberIds: string[];
  mapInstance: any;
  pendingLocation: PendingLocation | null;
  selectedMarkerIcons: string[];
  selectedGroupIds: string[];
  showExitDialog: boolean;
}

