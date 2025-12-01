import type { Language } from "./language-context";

export const translations = {
  ko: {
    // Navigation
    nav: {
      map: "지도",
      memos: "메모",
      groups: "그룹",
      profile: "마이페이지",
      settings: "설정",
    },
    // Common
    common: {
      cancel: "취소",
      save: "저장",
      delete: "삭제",
      edit: "수정",
      create: "만들기",
      join: "참여하기",
      leave: "나가기",
      copy: "복사",
      close: "닫기",
      yes: "예",
      no: "아니요",
      personal: "개인",
      addressSearchPlaceholder: "주소를 입력하세요 (예: 서울시 강남구 역삼동)",
      locationLockModeActive: "위치 고정 모드 활성화",
      markerFilter: "마커 필터",
      groupFilter: "그룹 필터",
      allGroups: "전체 그룹",
    },
    // Categories
    categories: {
      all: "전체",
      default: "기본",
      travel: "여행",
      love: "사랑",
      food: "맛집",
      cafe: "카페",
      shopping: "쇼핑",
      sport: "운동",
      work: "업무",
    },
    // Colors
    colors: {
      blue: "파랑",
      red: "빨강",
      green: "초록",
      yellow: "노랑",
      purple: "보라",
      pink: "분홍",
      orange: "주황",
      teal: "청록",
    },
    // Memo Form
    memoForm: {
      newMemo: "새 메모 추가",
      editMemo: "메모 편집",
      buildingName: "건물명",
      buildingNamePlaceholder: "건물명",
      address: "주소",
      addressPlaceholder: "주소",
      content: "메모",
      contentPlaceholder: "메모 내용을 입력하세요",
      photos: "사진",
      addPhoto: "사진 추가",
      markerIcon: "마커 아이콘",
      groupShare: "그룹 공유 (선택 안 하면 개인 메모)",
      selectGroup: "그룹 선택",
      groupsSelected: "{count}개 그룹 선택됨",
    },
    // Memo Detail
    memoDetail: {
      photos: "사진",
      content: "메모 내용",
      author: "작성자",
      editor: "수정자",
      group: "그룹",
      created: "작성",
      viewOnMap: "지도에서 위치 보기",
      addMemoHere: "새 메모 추가",
      confirmDelete: "정말 삭제하시겠습니까?",
    },
    // Memo List
    memoList: {
      noMemos: "아직 메모가 없습니다",
      noMemosDesc: "지도에서 위치를 선택하여 메모를 추가하세요",
      noCategoryMemos: "카테고리에 메모가 없습니다",
      noCategoryMemosDesc: "다른 카테고리를 선택하거나 새 메모를 추가하세요",
    },
    // Group Management
    groups: {
      title: "그룹 관리",
      createGroup: "그룹 만들기",
      joinGroup: "그룹 참여하기",
      newGroup: "새 그룹 만들기",
      editGroup: "그룹 정보 수정",
      groupName: "그룹명",
      groupNamePlaceholder: "예: 친구들",
      description: "상세내용",
      descriptionPlaceholder: "그룹에 대한 설명을 입력하세요",
      noDescription: "상세내용이 없습니다",
      myName: "내 이름",
      myNamePlaceholder: "홍길동",
      groupColor: "그룹 색상",
      markerShape: "마커 모양",
      inviteCode: "초대 코드",
      inviteCodePlaceholder: "6자리 코드 입력",
      inviteCodeCopied: "초대 코드 복사됨",
      leftGroup: "그룹에서 나갔습니다",
      noGroups: "아직 참여한 그룹이 없습니다",
      noGroupsDesc: "새 그룹을 만들거나 초대 코드로 참여하세요",
      members: "명",
      memberCount: "참여인원",
      copyInviteCode: "초대 코드 복사",
      deleteGroup: "그룹 삭제",
      confirmDeleteGroup: "정말 이 그룹을 삭제하시겠습니까? 그룹의 모든 메모가 삭제됩니다.",
      leader: "방장",
      transferLeadership: "방장 이양",
      confirmTransferLeadership: "님에게 방장 권한을 이양하시겠습니까?",
      removeMember: "멤버 강퇴",
      transfer: "위임",
      remove: "내보내기",
      joining: "참여 중...",
      joinButton: "참여하기",
      searchGroups: "그룹 검색",
      searchPlaceholder: "그룹 이름, 설명, 멤버 검색...",
      noSearchResults: "검색 결과가 없습니다",
      noSearchResultsDesc: "다른 검색어를 시도해보세요",
      searchResultsCount: "개의 그룹을 찾았습니다",
      canEditGroupMemos: "그룹 메모 수정 권한",
      copyGroup: "그룹 메모 복사",
      copyGroupDesc: "그룹의 모든 메모를 새로운 그룹으로 복사합니다.",
      memoCount: "복사할 메모 개수",
      requiredPoints: "필요한 포인트",
      currentPoints: "현재 보유 포인트",
      insufficientPoints: "포인트가 부족합니다. 필요한 포인트:",
      confirmCopy: "복사하기",
      customColor: "사용자 정의",
    },
    // Settings
    settings: {
      title: "설정",
      darkMode: "다크모드",
      darkModeDesc: "화면 테마를 변경합니다",
      darkModeEnable: "다크모드 활성화",
      language: "언어 / Language",
      languageDesc: "앱 표시 언어를 선택하세요",
      font: "폰트 설정",
      fontDesc: "앱에서 사용할 폰트와 크기를 선택하세요",
      fontFamily: "폰트 선택",
      fontSize: "글자 크기",
      fontDefault: "기본 (Roboto)",
      fontNotoSans: "깔끔한 (Noto Sans KR)",
      fontNanumGothic: "부드러운 (나눔고딕)",
      fontGamjaFlower: "귀여운 (감자꽃)",
      fontDokdo: "귀여운 (독도)",
      fontNanumPen: "손글씨 (나눔펜)",
      fontSizeSmall: "작게",
      fontSizeMedium: "보통",
      fontSizeLarge: "크게",
      notifications: "알림",
      notificationsDesc: "앱 내 모든 토스트 알림을 켜거나 끕니다",
      notificationsEnable: "알림 활성화",
      memoNotifications: "메모 알림",
      memoNotificationsDesc: "근처 메모가 있을 때 알림을 받습니다",
      proximityRadius: "알림 반경",
      proximityRadiusDesc: "이 거리 이내의 메모가 있으면 알림을 받습니다",
      radius50m: "50미터",
      radius100m: "100미터",
      radius200m: "200미터",
      location: "위치",
      locationDesc: "현재 위치를 추적하여 근처 메모를 알려줍니다",
      locationTracking: "위치 추적",
      serviceSettings: "서비스 설정",
      displaySettings: "표시 설정",
      appInfo: "앱 정보",
      version: "버전",
      developer: "개발자",
      developerName: "Memo Way Team",
      account: "계정",
      accountInfo: "로그인된 계정 정보",
      logout: "로그아웃",
      logoutDesc: "현재 계정에서 로그아웃합니다",
      mapProvider: "지도 프로바이더",
      mapProviderDesc: "사용할 지도 서비스를 선택하세요",
      mapProviderKakao: "카카오맵",
      mapProviderGoogle: "구글맵",
      points: "포인트",
      pointsDesc: "그룹 메모 복사 시 사용됩니다 (메모 1개당 10포인트)",
      currentPointsLabel: "보유 포인트",
      purchasePoints: "포인트 구매",
      purchasePointsTitle: "포인트 구매",
      purchasePointsDesc: "원하시는 포인트 패키지를 선택해주세요",
      pointsPackage: "포인트",
      canCopyMemos: "메모 약 {count}개 복사 가능",
      popular: "인기",
      pointsUsageNote: "💡 포인트는 그룹 메모를 개인 그룹으로 복사할 때 사용됩니다",
      pointsCharged: "✨ 포인트 충전 완료",
      pointsChargedDesc: "{amount} 포인트가 충전되었습니다!",
      authExpired: "인증 만료",
      authExpiredDesc: "세션이 만료되었습니다. 페이지를 새로고침하여 다시 로그인해주세요.",
      pointsChargeFailed: "포인트 충전 실패",
      pointsChargeFailedDesc: "포인트 충전 중 오류가 발생했습니다. 다시 시도해주세요.",
      community: "커뮤니티",
      communityDesc: "다른 사용자들과 메모를 공유하고 소통할 수 있는 공간입니다. 특별한 장소의 추억과 정보를 함께 나눠보세요.",
      visitCommunity: "커뮤니티 방문하기",
      personalSettings: "개인 설정",
      personalSettingsDesc: "앱의 언어, 폰트, 테마 등을 설정합니다",
      store: "상점",
      storeDesc: "포인트를 구매하고 다양한 기능을 이용하세요",
      customerSupport: "고객지원",
      customerSupportDesc: "문의사항이나 도움이 필요하신가요?",
      appInfo: "앱 정보",
      appInfoDesc: "앱 버전 및 개발자 정보를 확인하세요",
    },
    // Toast messages
    toast: {
      newMemo: "새 메모 알림",
      newMemoDesc: "에 새 메모가 추가되었습니다",
      memoUpdated: "메모 업데이트",
      memoUpdatedDesc: " 메모가 수정되었습니다",
      personalSetupFailed: "개인 메모 설정 실패",
      personalSetupFailedDesc: "개인 메모를 사용하려면 페이지를 새로고침하세요",
      memoCreated: "메모 생성 완료",
      memoCreatedDesc: "새 메모가 추가되었습니다",
      memoEditSuccess: "메모 수정 완료",
      memoEditSuccessDesc: "메모가 수정되었습니다",
      memoDeleted: "메모 삭제 완료",
      memoDeletedDesc: "메모가 삭제되었습니다",
      groupCreated: "그룹 생성 완료",
      groupCreatedDesc: "새 그룹이 생성되었습니다",
      groupJoined: "그룹 참여 완료",
      groupJoinedDesc: "그룹에 참여했습니다",
      groupLeft: "그룹 나가기 완료",
      groupLeftDesc: "그룹에서 나갔습니다",
      groupDeleted: "그룹 삭제 완료",
      groupDeletedDesc: "그룹이 삭제되었습니다",
      leadershipTransferred: "방장 이양 완료",
      leadershipTransferredDesc: "방장 권한이 이양되었습니다",
      leadershipTransferError: "방장 이양 실패",
      deleteSuccess: "삭제 완료",
      deleteError: "삭제 실패",
      viewLocation: "위치 보기",
      searchNoResults: "검색 결과 없음",
      searchNoResultsDesc: "현재 위치에서 5km 반경 내에 검색 결과가 없습니다.",
      searchComplete: "검색 완료",
      searchCompleteDesc: "{count}개의 장소를 찾았습니다{radius}",
      searchFailed: "검색 실패",
      searchFailedDesc: "장소나 주소를 찾을 수 없습니다. 다른 키워드로 다시 시도해주세요",
      locationFound: "위치 찾기 완료",
      locationError: "오류",
      locationErrorDesc: "위치 정보를 불러올 수 없습니다",
      addressNotFound: "주소를 찾을 수 없습니다",
      mapLockEnabled: "지도 확대/축소 잠금",
      mapLockEnabledDesc: "지도를 움직일 수 있지만 확대/축소는 불가능합니다",
      mapLockDisabled: "지도 확대/축소 잠금 해제",
      mapLockDisabledDesc: "지도를 자유롭게 움직이고 확대/축소할 수 있습니다",
      locationLockEnabled: "위치 고정",
      locationLockEnabledDesc: "내 위치가 화면 중앙에 고정되며, 지도가 따라 움직입니다",
      locationLockDisabled: "위치 고정 해제",
      locationLockDisabledDesc: "내 위치 고정이 해제되었습니다",
      zoomLockEnabled: "확대/축소 잠금",
      zoomLockEnabledDesc: "지도 확대/축소가 비활성화되었습니다",
      zoomLockDisabled: "확대/축소 잠금 해제",
      zoomLockDisabledDesc: "지도를 자유롭게 확대/축소할 수 있습니다",
      mainMemoSet: "메인 메모 설정 완료",
      mainMemoSetDesc: "이 메모가 지도에 표시됩니다.",
      groupLeaveFailed: "그룹 나가기 실패",
      groupLeaveFailedDesc: "그룹에서 나가는 중 오류가 발생했습니다",
      groupCopySuccess: "그룹 복사 완료",
      groupCopySuccessDesc: "새로운 그룹 \"{name}\"이(가) 생성되었고, {count}개의 메모가 복사되었습니다 ({points} 포인트 사용)",
      groupCopyFailed: "그룹 복사 실패",
      pointsInsufficient: "포인트 부족",
      memberRemoveSuccess: "멤버 강퇴 완료",
      memberRemoveSuccessDesc: "멤버가 그룹에서 제거되었습니다",
      memberRemoveFailed: "멤버 강퇴 실패",
      memberRemoveFailedDesc: "멤버 제거 중 오류가 발생했습니다",
      groupUpdateSuccess: "그룹 수정 완료",
      memosLoadFailed: "메모를 불러올 수 없습니다",
      memosLoadFailedDesc: "잠시 후 다시 시도해주세요.",
      groupsLoadFailed: "그룹을 불러올 수 없습니다",
      groupsLoadFailedDesc: "잠시 후 다시 시도해주세요.",
      notificationPermissionRequired: "알림 권한 필요",
      notificationPermissionRequiredDesc: "알림을 받으려면 설정에서 알림 권한을 허용하세요",
      notificationPermissionRequestFailed: "알림 권한 요청 실패",
      notificationPermissionRequestFailedDesc: "알림 권한을 요청하는 중 오류가 발생했습니다",
      notificationPermissionRequiredBrowser: "알림 권한 필요",
      notificationPermissionRequiredBrowserDesc: "알림을 받으려면 브라우저에서 알림 권한을 허용하세요",
      locationServiceUnavailable: "위치 서비스 없음",
      locationServiceUnavailableDesc: "이 브라우저는 위치 서비스를 지원하지 않습니다",
      bulkDeleteSuccess: "{count}개의 메모가 삭제되었습니다.",
      googleMapsLoadFailed: "Google Maps를 불러올 수 없습니다",
      googleMapsLoadFailedDesc: "Google Maps API 키가 설정되지 않았습니다. 카카오맵을 사용하거나 환경 변수에 VITE_GOOGLE_MAPS_API_KEY를 추가해주세요.",
      searchError: "검색 오류",
      searchErrorDesc: "주소 검색 중 오류가 발생했습니다. Google Maps API가 제대로 로드되었는지 확인해주세요.",
      searchErrorPlaces: "주소 검색 중 오류가 발생했습니다. Google Cloud Console에서 Places API와 Geocoding API를 활성화해주세요.",
      locationMoveComplete: "\"{query}\" 위치로 이동했습니다",
      currentLocationError: "현재 위치를 가져올 수 없습니다",
    },
    // Time
    time: {
      ago: "전",
      justNow: "방금",
      minutesAgo: "분 전",
      hoursAgo: "시간 전",
      daysAgo: "일 전",
      monthsAgo: "개월 전",
      yearsAgo: "년 전",
    },
    // Exit Dialog
    exitDialog: {
      title: "앱 종료",
      description: "정말로 앱을 종료하시겠습니까?",
      cancel: "취소",
      confirm: "종료",
    },
  },
  en: {
    // Navigation
    nav: {
      map: "Map",
      memos: "Memos",
      groups: "Groups",
      profile: "Profile",
      settings: "Settings",
    },
    // Common
    common: {
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      create: "Create",
      join: "Join",
      leave: "Leave",
      copy: "Copy",
      close: "Close",
      yes: "Yes",
      no: "No",
      personal: "Personal",
      addressSearchPlaceholder: "Enter address (e.g., Gangnam-gu, Seoul)",
      locationLockModeActive: "Location Lock Mode Active",
      markerFilter: "Marker Filter",
      groupFilter: "Group Filter",
      allGroups: "All Groups",
    },
    // Categories
    categories: {
      all: "All",
      default: "Default",
      travel: "Travel",
      love: "Love",
      food: "Food",
      cafe: "Cafe",
      shopping: "Shopping",
      sport: "Sport",
      work: "Work",
    },
    // Colors
    colors: {
      blue: "Blue",
      red: "Red",
      green: "Green",
      yellow: "Yellow",
      purple: "Purple",
      pink: "Pink",
      orange: "Orange",
      teal: "Teal",
    },
    // Memo Form
    memoForm: {
      newMemo: "Add New Memo",
      editMemo: "Edit Memo",
      buildingName: "Building Name",
      buildingNamePlaceholder: "Building name",
      address: "Address",
      addressPlaceholder: "Address",
      content: "Memo",
      contentPlaceholder: "Enter memo content",
      photos: "Photos",
      addPhoto: "Add Photo",
      markerIcon: "Marker Icon",
      groupShare: "Share with Group (Leave blank for personal memo)",
      selectGroup: "Select Group",
      groupsSelected: "{count} groups selected",
    },
    // Memo Detail
    memoDetail: {
      photos: "Photos",
      content: "Memo Content",
      author: "Author",
      editor: "Editor",
      group: "Group",
      created: "Created",
      viewOnMap: "View Location on Map",
      addMemoHere: "Add New Memo Here",
      confirmDelete: "Are you sure you want to delete?",
    },
    // Memo List
    memoList: {
      noMemos: "No memos yet",
      noMemosDesc: "Select a location on the map to add a memo",
      noCategoryMemos: "No memos in this category",
      noCategoryMemosDesc: "Select another category or add a new memo",
    },
    // Group Management
    groups: {
      title: "Group Management",
      createGroup: "Create Group",
      joinGroup: "Join Group",
      newGroup: "Create New Group",
      editGroup: "Edit Group Info",
      groupName: "Group Name",
      groupNamePlaceholder: "e.g., Friends",
      description: "Description",
      descriptionPlaceholder: "Enter group description",
      noDescription: "No description available",
      myName: "My Name",
      myNamePlaceholder: "John Doe",
      groupColor: "Group Color",
      markerShape: "Marker Shape",
      inviteCode: "Invite Code",
      inviteCodePlaceholder: "Enter 6-digit code",
      inviteCodeCopied: "Invite code copied",
      leftGroup: "Left the group",
      noGroups: "No groups joined yet",
      noGroupsDesc: "Create a new group or join with an invite code",
      members: " members",
      memberCount: "Members",
      copyInviteCode: "Copy Invite Code",
      deleteGroup: "Delete Group",
      confirmDeleteGroup: "Are you sure you want to delete this group? All memos in the group will be deleted.",
      leader: "Leader",
      transferLeadership: "Transfer Leadership",
      confirmTransferLeadership: " to transfer leadership?",
      removeMember: "Remove Member",
      transfer: "Transfer",
      remove: "Remove",
      joining: "Joining...",
      joinButton: "Join",
      searchGroups: "Search Groups",
      searchPlaceholder: "Search groups by name, description, members...",
      noSearchResults: "No search results",
      noSearchResultsDesc: "Try a different search term",
      searchResultsCount: " groups found",
      canEditGroupMemos: "Can edit group memos",
      copyGroup: "Copy Group Memos",
      copyGroupDesc: "Copy all memos from this group to a new group.",
      memoCount: "Memos to Copy",
      requiredPoints: "Required Points",
      currentPoints: "Current Points",
      insufficientPoints: "Insufficient points. Required:",
      confirmCopy: "Copy",
      customColor: "Custom",
    },
    // Settings
    settings: {
      title: "Settings",
      darkMode: "Dark Mode",
      darkModeDesc: "Change the screen theme",
      darkModeEnable: "Enable Dark Mode",
      language: "Language",
      languageDesc: "Select app display language",
      font: "Font Settings",
      fontDesc: "Choose font and size for the app",
      fontFamily: "Font",
      fontSize: "Font Size",
      fontDefault: "Default (Roboto)",
      fontNotoSans: "Clean (Noto Sans KR)",
      fontNanumGothic: "Soft (Nanum Gothic)",
      fontGamjaFlower: "Cute (Gamja Flower)",
      fontDokdo: "Cute (Dokdo)",
      fontNanumPen: "Handwriting (Nanum Pen)",
      fontSizeSmall: "Small",
      fontSizeMedium: "Medium",
      fontSizeLarge: "Large",
      notifications: "Notifications",
      notificationsDesc: "Enable or disable all toast notifications in the app",
      notificationsEnable: "Enable Notifications",
      memoNotifications: "Memo Notifications",
      memoNotificationsDesc: "Receive notifications when there are nearby memos",
      proximityRadius: "Notification Radius",
      proximityRadiusDesc: "Get notified when memos are within this distance",
      radius50m: "50 meters",
      radius100m: "100 meters",
      radius200m: "200 meters",
      location: "Location",
      locationDesc: "Track your current location to notify nearby memos",
      locationTracking: "Location Tracking",
      serviceSettings: "Service Settings",
      displaySettings: "Display Settings",
      appInfo: "App Information",
      version: "Version",
      developer: "Developer",
      developerName: "Memo Way Team",
      account: "Account",
      accountInfo: "Logged in account information",
      logout: "Log Out",
      logoutDesc: "Sign out from your current account",
      mapProvider: "Map Provider",
      mapProviderDesc: "Select the map service to use",
      mapProviderKakao: "Kakao Map",
      mapProviderGoogle: "Google Maps",
      points: "Points",
      pointsDesc: "Used when copying group memos (10 points per memo)",
      currentPointsLabel: "Current Points",
      purchasePoints: "Purchase Points",
      purchasePointsTitle: "Purchase Points",
      purchasePointsDesc: "Select a points package",
      pointsPackage: "Points",
      canCopyMemos: "Can copy approx. {count} memos",
      popular: "Popular",
      pointsUsageNote: "💡 Points are used to copy group memos to your personal group",
      pointsCharged: "✨ Points Charged",
      pointsChargedDesc: "{amount} points have been added!",
      authExpired: "Authentication Expired",
      authExpiredDesc: "Session expired. Please refresh the page to log in again.",
      pointsChargeFailed: "Points Purchase Failed",
      pointsChargeFailedDesc: "An error occurred while purchasing points. Please try again.",
      community: "Community",
      communityDesc: "A space where you can share memos and communicate with other users. Share memories and information about special places together.",
      visitCommunity: "Visit Community",
      personalSettings: "Personal Settings",
      personalSettingsDesc: "Configure language, font, theme, and more",
      store: "Store",
      storeDesc: "Purchase points and access various features",
      customerSupport: "Customer Support",
      customerSupportDesc: "Need help or have questions?",
      appInfo: "App Information",
      appInfoDesc: "View app version and developer information",
    },
    // Toast messages
    toast: {
      newMemo: "New Memo",
      newMemoDesc: "A new memo has been added to ",
      memoUpdated: "Memo Updated",
      memoUpdatedDesc: " memo has been updated",
      personalSetupFailed: "Personal Memo Setup Failed",
      personalSetupFailedDesc: "Please refresh the page to use personal memos",
      memoCreated: "Memo Created",
      memoCreatedDesc: "A new memo has been added",
      memoEditSuccess: "Memo Updated",
      memoEditSuccessDesc: "The memo has been updated",
      memoDeleted: "Memo Deleted",
      memoDeletedDesc: "The memo has been deleted",
      groupCreated: "Group Created",
      groupCreatedDesc: "A new group has been created",
      groupJoined: "Joined Group",
      groupJoinedDesc: "You have joined the group",
      groupLeft: "Left Group",
      groupLeftDesc: "You have left the group",
      groupDeleted: "Group Deleted",
      groupDeletedDesc: "The group has been deleted",
      leadershipTransferred: "Leadership Transferred",
      leadershipTransferredDesc: "Leadership has been transferred",
      leadershipTransferError: "Transfer Failed",
      deleteSuccess: "Deleted successfully",
      deleteError: "Delete failed",
      viewLocation: "View Location",
      searchNoResults: "No search results",
      searchNoResultsDesc: "No search results found within 5km radius from current location.",
      searchComplete: "Search complete",
      searchCompleteDesc: "Found {count} places{radius}",
      searchFailed: "Search failed",
      searchFailedDesc: "Could not find place or address. Please try with different keywords",
      locationFound: "Location found",
      locationError: "Error",
      locationErrorDesc: "Unable to load location information",
      addressNotFound: "Address not found",
      mapLockEnabled: "Map zoom lock enabled",
      mapLockEnabledDesc: "You can move the map but zoom is disabled",
      mapLockDisabled: "Map zoom lock disabled",
      mapLockDisabledDesc: "You can freely move and zoom the map",
      locationLockEnabled: "Location lock enabled",
      locationLockEnabledDesc: "Your location is fixed at the center and the map follows",
      locationLockDisabled: "Location lock disabled",
      locationLockDisabledDesc: "Location lock has been disabled",
      zoomLockEnabled: "Zoom lock enabled",
      zoomLockEnabledDesc: "Map zoom is disabled",
      zoomLockDisabled: "Zoom lock disabled",
      zoomLockDisabledDesc: "You can freely zoom the map",
      mainMemoSet: "Main memo set",
      mainMemoSetDesc: "This memo will be displayed on the map",
      groupLeaveFailed: "Failed to leave group",
      groupLeaveFailedDesc: "An error occurred while leaving the group",
      groupCopySuccess: "Group copy complete",
      groupCopySuccessDesc: "New group \"{name}\" created and {count} memos copied ({points} points used)",
      groupCopyFailed: "Group copy failed",
      pointsInsufficient: "Insufficient points",
      memberRemoveSuccess: "Member removed",
      memberRemoveSuccessDesc: "Member has been removed from the group",
      memberRemoveFailed: "Failed to remove member",
      memberRemoveFailedDesc: "An error occurred while removing the member",
      groupUpdateSuccess: "Group updated",
      memosLoadFailed: "Failed to load memos",
      memosLoadFailedDesc: "Please try again later",
      groupsLoadFailed: "Failed to load groups",
      groupsLoadFailedDesc: "Please try again later",
      notificationPermissionRequired: "Notification permission required",
      notificationPermissionRequiredDesc: "Please allow notification permission in settings to receive notifications",
      notificationPermissionRequestFailed: "Notification permission request failed",
      notificationPermissionRequestFailedDesc: "An error occurred while requesting notification permission",
      notificationPermissionRequiredBrowser: "Notification permission required",
      notificationPermissionRequiredBrowserDesc: "Please allow notification permission in browser to receive notifications",
      locationServiceUnavailable: "Location service unavailable",
      locationServiceUnavailableDesc: "This browser does not support location services",
      bulkDeleteSuccess: "{count} memos deleted",
      googleMapsLoadFailed: "Unable to load Google Maps",
      googleMapsLoadFailedDesc: "Google Maps API key is not set. Use Kakao Map or add VITE_GOOGLE_MAPS_API_KEY to environment variables",
      searchError: "Search error",
      searchErrorDesc: "An error occurred while searching for address. Please check if Google Maps API is loaded correctly",
      searchErrorPlaces: "An error occurred while searching for address. Please enable Places API and Geocoding API in Google Cloud Console",
      locationMoveComplete: "Moved to \"{query}\"",
      currentLocationError: "Unable to get current location",
    },
    // Time
    time: {
      ago: " ago",
      justNow: "Just now",
      minutesAgo: " minutes ago",
      hoursAgo: " hours ago",
      daysAgo: " days ago",
      monthsAgo: " months ago",
      yearsAgo: " years ago",
    },
    // Exit Dialog
    exitDialog: {
      title: "Exit App",
      description: "Do you really want to exit the app?",
      cancel: "Cancel",
      confirm: "Exit",
    },
  },
  zh: {
    // Navigation
    nav: {
      map: "地图",
      memos: "备忘录",
      groups: "群组",
      profile: "我的",
      settings: "设置",
    },
    // Common
    common: {
      cancel: "取消",
      save: "保存",
      delete: "删除",
      edit: "编辑",
      create: "创建",
      join: "加入",
      leave: "退出",
      copy: "复制",
      close: "关闭",
      yes: "是",
      no: "否",
      personal: "个人",
      addressSearchPlaceholder: "输入地址（例如：北京市朝阳区）",
      locationLockModeActive: "位置锁定模式已激活",
      markerFilter: "标记筛选",
      groupFilter: "组筛选",
      allGroups: "所有组",
    },
    // Categories
    categories: {
      all: "全部",
      default: "默认",
      travel: "旅行",
      love: "爱情",
      food: "美食",
      cafe: "咖啡厅",
      shopping: "购物",
      sport: "运动",
      work: "工作",
    },
    // Colors
    colors: {
      blue: "蓝色",
      red: "红色",
      green: "绿色",
      yellow: "黄色",
      purple: "紫色",
      pink: "粉色",
      orange: "橙色",
      teal: "青色",
    },
    // Memo Form
    memoForm: {
      newMemo: "添加新备忘录",
      editMemo: "编辑备忘录",
      buildingName: "建筑名称",
      buildingNamePlaceholder: "建筑名称",
      address: "地址",
      addressPlaceholder: "地址",
      content: "备忘录",
      contentPlaceholder: "请输入备忘录内容",
      photos: "照片",
      addPhoto: "添加照片",
      markerIcon: "标记图标",
      groupShare: "与群组分享（不选则为个人备忘录）",
      selectGroup: "选择群组",
      groupsSelected: "已选择 {count} 个群组",
    },
    // Memo Detail
    memoDetail: {
      photos: "照片",
      content: "备忘录内容",
      author: "作者",
      editor: "编辑者",
      group: "群组",
      created: "创建",
      viewOnMap: "在地图上查看位置",
      addMemoHere: "在此添加新备忘录",
      confirmDelete: "确定要删除吗？",
    },
    // Memo List
    memoList: {
      noMemos: "暂无备忘录",
      noMemosDesc: "在地图上选择位置以添加备忘录",
      noCategoryMemos: "此类别中没有备忘录",
      noCategoryMemosDesc: "选择其他类别或添加新备忘录",
    },
    // Group Management
    groups: {
      title: "群组管理",
      createGroup: "创建群组",
      joinGroup: "加入群组",
      newGroup: "创建新群组",
      editGroup: "编辑群组信息",
      groupName: "群组名称",
      groupNamePlaceholder: "例如：朋友们",
      description: "详细说明",
      descriptionPlaceholder: "输入群组说明",
      noDescription: "暂无说明",
      myName: "我的名字",
      myNamePlaceholder: "张三",
      groupColor: "群组颜色",
      markerShape: "标记形状",
      inviteCode: "邀请码",
      inviteCodePlaceholder: "输入6位数代码",
      inviteCodeCopied: "邀请码已复制",
      leftGroup: "已退出群组",
      noGroups: "尚未加入任何群组",
      noGroupsDesc: "创建新群组或使用邀请码加入",
      members: "名成员",
      memberCount: "参与人员",
      copyInviteCode: "复制邀请码",
      deleteGroup: "删除群组",
      confirmDeleteGroup: "确定要删除此群组吗？群组中的所有备忘录将被删除。",
      leader: "群主",
      transferLeadership: "转让群主",
      confirmTransferLeadership: " 转让群主权限？",
      removeMember: "移除成员",
      transfer: "转让",
      remove: "移除",
      joining: "加入中...",
      joinButton: "加入",
      searchGroups: "搜索群组",
      searchPlaceholder: "按群组名称、说明、成员搜索...",
      noSearchResults: "无搜索结果",
      noSearchResultsDesc: "请尝试其他搜索词",
      searchResultsCount: "个群组",
      canEditGroupMemos: "可编辑群组备忘录",
      copyGroup: "复制群组备忘录",
      copyGroupDesc: "将该群组的所有备忘录复制到新群组。",
      memoCount: "要复制的备忘录数量",
      requiredPoints: "所需积分",
      currentPoints: "当前积分",
      insufficientPoints: "积分不足。所需积分：",
      confirmCopy: "复制",
      customColor: "自定义",
    },
    // Settings
    settings: {
      title: "设置",
      darkMode: "深色模式",
      darkModeDesc: "更改屏幕主题",
      darkModeEnable: "启用深色模式",
      language: "语言",
      languageDesc: "选择应用显示语言",
      font: "字体设置",
      fontDesc: "选择应用的字体和大小",
      fontFamily: "字体",
      fontSize: "字体大小",
      fontDefault: "默认 (Roboto)",
      fontNotoSans: "简洁 (Noto Sans KR)",
      fontNanumGothic: "柔和 (Nanum Gothic)",
      fontGamjaFlower: "可爱 (Gamja Flower)",
      fontDokdo: "可爱 (Dokdo)",
      fontNanumPen: "手写 (Nanum Pen)",
      fontSizeSmall: "小",
      fontSizeMedium: "中",
      fontSizeLarge: "大",
      notifications: "通知",
      notificationsDesc: "启用或禁用应用中的所有 toast 通知",
      notificationsEnable: "启用通知",
      memoNotifications: "备忘录通知",
      memoNotificationsDesc: "当附近有备忘录时接收通知",
      proximityRadius: "通知半径",
      proximityRadiusDesc: "当备忘录在此距离内时接收通知",
      radius50m: "50米",
      radius100m: "100米",
      radius200m: "200米",
      location: "位置",
      locationDesc: "跟踪您的当前位置以通知附近的备忘录",
      locationTracking: "位置跟踪",
      serviceSettings: "服务设置",
      displaySettings: "显示设置",
      appInfo: "应用信息",
      version: "版本",
      developer: "开发者",
      developerName: "Memo Way Team",
      account: "账户",
      accountInfo: "已登录账户信息",
      logout: "退出登录",
      logoutDesc: "从当前账户退出登录",
      mapProvider: "地图提供商",
      mapProviderDesc: "选择要使用的地图服务",
      mapProviderKakao: "Kakao地图",
      mapProviderGoogle: "Google地图",
      points: "积分",
      pointsDesc: "复制群组备忘录时使用（每个备忘录10积分）",
      currentPointsLabel: "当前积分",
      purchasePoints: "购买积分",
      purchasePointsTitle: "购买积分",
      purchasePointsDesc: "请选择积分套餐",
      pointsPackage: "积分",
      canCopyMemos: "可复制约{count}个备忘录",
      popular: "热门",
      pointsUsageNote: "💡 积分用于将群组备忘录复制到您的个人群组",
      pointsCharged: "✨ 积分充值成功",
      pointsChargedDesc: "已充值{amount}积分！",
      authExpired: "身份验证已过期",
      authExpiredDesc: "会话已过期。请刷新页面重新登录。",
      pointsChargeFailed: "积分购买失败",
      pointsChargeFailedDesc: "购买积分时出错。请重试。",
      community: "社区",
      communityDesc: "与其他用户分享备忘录和交流的空间。一起分享特殊地点的回忆和信息。",
      visitCommunity: "访问社区",
      personalSettings: "个人设置",
      personalSettingsDesc: "配置语言、字体、主题等",
      store: "商店",
      storeDesc: "购买积分并访问各种功能",
      customerSupport: "客户支持",
      customerSupportDesc: "需要帮助或有疑问？",
      appInfo: "应用信息",
      appInfoDesc: "查看应用版本和开发者信息",
    },
    // Toast messages
    toast: {
      newMemo: "新备忘录",
      newMemoDesc: "已添加新备忘录到",
      memoUpdated: "备忘录已更新",
      memoUpdatedDesc: "备忘录已修改",
      personalSetupFailed: "个人备忘录设置失败",
      personalSetupFailedDesc: "请刷新页面以使用个人备忘录",
      memoCreated: "备忘录创建成功",
      memoCreatedDesc: "已添加新备忘录",
      memoEditSuccess: "备忘录更新成功",
      memoEditSuccessDesc: "备忘录已更新",
      memoDeleted: "备忘录删除成功",
      memoDeletedDesc: "备忘录已删除",
      groupCreated: "群组创建成功",
      groupCreatedDesc: "已创建新群组",
      groupJoined: "加入群组成功",
      groupJoinedDesc: "您已加入该群组",
      groupLeft: "退出群组成功",
      groupLeftDesc: "您已退出该群组",
      groupDeleted: "群组删除成功",
      groupDeletedDesc: "群组已删除",
      leadershipTransferred: "群主转让成功",
      leadershipTransferredDesc: "群主权限已转让",
      leadershipTransferError: "转让失败",
      deleteSuccess: "删除成功",
      deleteError: "删除失败",
      viewLocation: "查看位置",
      searchNoResults: "无搜索结果",
      searchNoResultsDesc: "当前位置5公里范围内未找到搜索结果",
      searchComplete: "搜索完成",
      searchCompleteDesc: "找到 {count} 个地点{radius}",
      searchFailed: "搜索失败",
      searchFailedDesc: "找不到地点或地址。请尝试使用其他关键词",
      locationFound: "位置查找完成",
      locationError: "错误",
      locationErrorDesc: "无法加载位置信息",
      addressNotFound: "找不到地址",
      mapLockEnabled: "地图缩放锁定已启用",
      mapLockEnabledDesc: "可以移动地图但无法缩放",
      mapLockDisabled: "地图缩放锁定已禁用",
      mapLockDisabledDesc: "可以自由移动和缩放地图",
      locationLockEnabled: "位置锁定已启用",
      locationLockEnabledDesc: "您的位置固定在中心，地图会跟随",
      locationLockDisabled: "位置锁定已禁用",
      locationLockDisabledDesc: "位置锁定已禁用",
      zoomLockEnabled: "缩放锁定已启用",
      zoomLockEnabledDesc: "地图缩放已禁用",
      zoomLockDisabled: "缩放锁定已禁用",
      zoomLockDisabledDesc: "可以自由缩放地图",
      mainMemoSet: "主备忘录设置完成",
      mainMemoSetDesc: "此备忘录将显示在地图上",
      groupLeaveFailed: "退出群组失败",
      groupLeaveFailedDesc: "退出群组时发生错误",
      groupCopySuccess: "群组复制完成",
      groupCopySuccessDesc: "新群组 \"{name}\" 已创建，已复制 {count} 个备忘录（使用 {points} 积分）",
      groupCopyFailed: "群组复制失败",
      pointsInsufficient: "积分不足",
      memberRemoveSuccess: "成员已移除",
      memberRemoveSuccessDesc: "成员已从群组中移除",
      memberRemoveFailed: "移除成员失败",
      memberRemoveFailedDesc: "移除成员时发生错误",
      groupUpdateSuccess: "群组更新完成",
      memosLoadFailed: "无法加载备忘录",
      memosLoadFailedDesc: "请稍后再试",
      groupsLoadFailed: "无法加载群组",
      groupsLoadFailedDesc: "请稍后再试",
      notificationPermissionRequired: "需要通知权限",
      notificationPermissionRequiredDesc: "请在设置中允许通知权限以接收通知",
      notificationPermissionRequestFailed: "通知权限请求失败",
      notificationPermissionRequestFailedDesc: "请求通知权限时发生错误",
      notificationPermissionRequiredBrowser: "需要通知权限",
      notificationPermissionRequiredBrowserDesc: "请在浏览器中允许通知权限以接收通知",
      locationServiceUnavailable: "位置服务不可用",
      locationServiceUnavailableDesc: "此浏览器不支持位置服务",
      bulkDeleteSuccess: "已删除 {count} 个备忘录",
      googleMapsLoadFailed: "无法加载 Google 地图",
      googleMapsLoadFailedDesc: "未设置 Google 地图 API 密钥。请使用 Kakao 地图或在环境变量中添加 VITE_GOOGLE_MAPS_API_KEY",
      searchError: "搜索错误",
      searchErrorDesc: "搜索地址时发生错误。请检查 Google 地图 API 是否正确加载",
      searchErrorPlaces: "搜索地址时发生错误。请在 Google Cloud Console 中启用 Places API 和 Geocoding API",
      locationMoveComplete: "已移动到 \"{query}\"",
      currentLocationError: "无法获取当前位置",
    },
    // Time
    time: {
      ago: "前",
      justNow: "刚刚",
      minutesAgo: "分钟前",
      hoursAgo: "小时前",
      daysAgo: "天前",
      monthsAgo: "个月前",
      yearsAgo: "年前",
    },
    // Exit Dialog
    exitDialog: {
      title: "退出应用",
      description: "确定要退出应用吗？",
      cancel: "取消",
      confirm: "退出",
    },
  },
  ja: {
    // Navigation
    nav: {
      map: "地図",
      memos: "メモ",
      groups: "グループ",
      profile: "マイページ",
      settings: "設定",
    },
    // Common
    common: {
      cancel: "キャンセル",
      save: "保存",
      delete: "削除",
      edit: "編集",
      create: "作成",
      join: "参加",
      leave: "退出",
      copy: "コピー",
      close: "閉じる",
      yes: "はい",
      no: "いいえ",
      personal: "個人",
      addressSearchPlaceholder: "住所を入力してください（例：東京都渋谷区）",
      locationLockModeActive: "位置固定モード有効",
      markerFilter: "マーカーフィルター",
      groupFilter: "グループフィルター",
      allGroups: "すべてのグループ",
    },
    // Categories
    categories: {
      all: "すべて",
      default: "デフォルト",
      travel: "旅行",
      love: "恋愛",
      food: "グルメ",
      cafe: "カフェ",
      shopping: "ショッピング",
      sport: "運動",
      work: "仕事",
    },
    // Colors
    colors: {
      blue: "青",
      red: "赤",
      green: "緑",
      yellow: "黄色",
      purple: "紫",
      pink: "ピンク",
      orange: "オレンジ",
      teal: "ティール",
    },
    // Memo Form
    memoForm: {
      newMemo: "新しいメモを追加",
      editMemo: "メモを編集",
      buildingName: "建物名",
      buildingNamePlaceholder: "建物名",
      address: "住所",
      addressPlaceholder: "住所",
      content: "メモ",
      contentPlaceholder: "メモ内容を入力してください",
      photos: "写真",
      addPhoto: "写真を追加",
      markerIcon: "マーカーアイコン",
      groupShare: "グループと共有（選択しない場合は個人メモ）",
      selectGroup: "グループを選択",
      groupsSelected: "{count}個のグループが選択されました",
    },
    // Memo Detail
    memoDetail: {
      photos: "写真",
      content: "メモ内容",
      author: "作成者",
      editor: "編集者",
      group: "グループ",
      created: "作成",
      viewOnMap: "地図で位置を表示",
      addMemoHere: "ここに新しいメモを追加",
      confirmDelete: "本当に削除しますか？",
    },
    // Memo List
    memoList: {
      noMemos: "まだメモがありません",
      noMemosDesc: "地図上で場所を選択してメモを追加してください",
      noCategoryMemos: "このカテゴリにメモがありません",
      noCategoryMemosDesc: "別のカテゴリを選択するか、新しいメモを追加してください",
    },
    // Group Management
    groups: {
      title: "グループ管理",
      createGroup: "グループを作成",
      joinGroup: "グループに参加",
      newGroup: "新しいグループを作成",
      editGroup: "グループ情報を編集",
      groupName: "グループ名",
      groupNamePlaceholder: "例：友達",
      description: "詳細説明",
      descriptionPlaceholder: "グループの説明を入力してください",
      noDescription: "説明がありません",
      myName: "私の名前",
      myNamePlaceholder: "山田太郎",
      groupColor: "グループカラー",
      markerShape: "マーカー形状",
      inviteCode: "招待コード",
      inviteCodePlaceholder: "6桁のコードを入力",
      inviteCodeCopied: "招待コードをコピーしました",
      leftGroup: "グループから退出しました",
      noGroups: "まだグループに参加していません",
      noGroupsDesc: "新しいグループを作成するか、招待コードで参加してください",
      members: "名のメンバー",
      memberCount: "参加人数",
      copyInviteCode: "招待コードをコピー",
      deleteGroup: "グループを削除",
      confirmDeleteGroup: "このグループを削除してもよろしいですか？グループ内のすべてのメモが削除されます。",
      leader: "リーダー",
      transferLeadership: "リーダー譲渡",
      confirmTransferLeadership: " にリーダー権限を譲渡しますか？",
      removeMember: "メンバーを削除",
      transfer: "譲渡",
      remove: "削除",
      joining: "参加中...",
      joinButton: "参加",
      searchGroups: "グループを検索",
      searchPlaceholder: "グループ名、説明、メンバーで検索...",
      noSearchResults: "検索結果がありません",
      noSearchResultsDesc: "別の検索ワードをお試しください",
      searchResultsCount: "個のグループ",
      canEditGroupMemos: "グループメモの編集権限",
      copyGroup: "グループメモをコピー",
      copyGroupDesc: "このグループのすべてのメモを新しいグループにコピーします。",
      memoCount: "コピーするメモ数",
      requiredPoints: "必要なポイント",
      currentPoints: "現在のポイント",
      insufficientPoints: "ポイントが不足しています。必要なポイント：",
      confirmCopy: "コピー",
      customColor: "カスタム",
    },
    // Settings
    settings: {
      title: "設定",
      darkMode: "ダークモード",
      darkModeDesc: "画面テーマを変更します",
      darkModeEnable: "ダークモードを有効にする",
      language: "言語",
      languageDesc: "アプリの表示言語を選択してください",
      font: "フォント設定",
      fontDesc: "アプリで使用するフォントとサイズを選択してください",
      fontFamily: "フォント",
      fontSize: "フォントサイズ",
      fontDefault: "デフォルト (Roboto)",
      fontNotoSans: "きれいな (Noto Sans KR)",
      fontNanumGothic: "柔らかい (Nanum Gothic)",
      fontGamjaFlower: "可愛い (Gamja Flower)",
      fontDokdo: "可愛い (Dokdo)",
      fontNanumPen: "手書き (Nanum Pen)",
      fontSizeSmall: "小",
      fontSizeMedium: "中",
      fontSizeLarge: "大",
      notifications: "通知",
      notificationsDesc: "アプリ内のすべてのトースト通知を有効または無効にします",
      notificationsEnable: "通知を有効にする",
      memoNotifications: "メモ通知",
      memoNotificationsDesc: "近くにメモがあるときに通知を受け取ります",
      proximityRadius: "通知半径",
      proximityRadiusDesc: "この距離内のメモがあるときに通知を受け取ります",
      radius50m: "50メートル",
      radius100m: "100メートル",
      radius200m: "200メートル",
      location: "位置情報",
      locationDesc: "現在地を追跡して近くのメモを通知します",
      locationTracking: "位置追跡",
      serviceSettings: "サービス設定",
      displaySettings: "表示設定",
      appInfo: "アプリ情報",
      version: "バージョン",
      developer: "開発者",
      developerName: "Memo Way Team",
      account: "アカウント",
      accountInfo: "ログイン中のアカウント情報",
      logout: "ログアウト",
      logoutDesc: "現在のアカウントからログアウトします",
      mapProvider: "地図プロバイダー",
      mapProviderDesc: "使用する地図サービスを選択してください",
      mapProviderKakao: "Kakao地図",
      mapProviderGoogle: "Google地図",
      points: "ポイント",
      pointsDesc: "グループメモをコピーする際に使用されます（メモ1つあたり10ポイント）",
      currentPointsLabel: "保有ポイント",
      purchasePoints: "ポイント購入",
      purchasePointsTitle: "ポイント購入",
      purchasePointsDesc: "お好みのポイントパッケージを選択してください",
      pointsPackage: "ポイント",
      canCopyMemos: "約{count}個のメモをコピー可能",
      popular: "人気",
      pointsUsageNote: "💡 ポイントはグループメモを個人グループにコピーする際に使用されます",
      pointsCharged: "✨ ポイント購入完了",
      pointsChargedDesc: "{amount}ポイントが購入されました！",
      authExpired: "認証が期限切れです",
      authExpiredDesc: "セッションが期限切れになりました。ページを更新して再度ログインしてください。",
      pointsChargeFailed: "ポイント購入失敗",
      pointsChargeFailedDesc: "ポイント購入中にエラーが発生しました。もう一度お試しください。",
      community: "コミュニティ",
      communityDesc: "他のユーザーとメモを共有し、交流できるスペースです。特別な場所の思い出や情報を一緒に共有しましょう。",
      visitCommunity: "コミュニティを訪問",
      personalSettings: "個人設定",
      personalSettingsDesc: "言語、フォント、テーマなどを設定します",
      store: "ショップ",
      storeDesc: "ポイントを購入して様々な機能を利用できます",
      customerSupport: "カスタマーサポート",
      customerSupportDesc: "お問い合わせやサポートが必要ですか？",
      appInfo: "アプリ情報",
      appInfoDesc: "アプリバージョンと開発者情報を確認できます",
    },
    // Toast messages
    toast: {
      newMemo: "新しいメモ",
      newMemoDesc: "に新しいメモが追加されました",
      memoUpdated: "メモが更新されました",
      memoUpdatedDesc: "のメモが変更されました",
      personalSetupFailed: "個人メモの設定に失敗しました",
      personalSetupFailedDesc: "個人メモを使用するにはページを更新してください",
      memoCreated: "メモが作成されました",
      memoCreatedDesc: "新しいメモが追加されました",
      memoEditSuccess: "メモが更新されました",
      memoEditSuccessDesc: "メモが更新されました",
      memoDeleted: "メモが削除されました",
      memoDeletedDesc: "メモが削除されました",
      groupCreated: "グループが作成されました",
      groupCreatedDesc: "新しいグループが作成されました",
      groupJoined: "グループに参加しました",
      groupJoinedDesc: "グループに参加しました",
      groupLeft: "グループから退出しました",
      groupLeftDesc: "グループから退出しました",
      groupDeleted: "グループが削除されました",
      groupDeletedDesc: "グループが削除されました",
      leadershipTransferred: "リーダー譲渡完了",
      leadershipTransferredDesc: "リーダー権限が譲渡されました",
      leadershipTransferError: "譲渡失敗",
      deleteSuccess: "削除しました",
      deleteError: "削除に失敗しました",
      viewLocation: "位置を表示",
      searchNoResults: "検索結果なし",
      searchNoResultsDesc: "現在地から5km圏内に検索結果が見つかりませんでした",
      searchComplete: "検索完了",
      searchCompleteDesc: "{count}件の場所が見つかりました{radius}",
      searchFailed: "検索失敗",
      searchFailedDesc: "場所や住所が見つかりません。別のキーワードで再試行してください",
      locationFound: "位置検索完了",
      locationError: "エラー",
      locationErrorDesc: "位置情報を読み込めません",
      addressNotFound: "住所が見つかりません",
      mapLockEnabled: "地図ズームロック有効",
      mapLockEnabledDesc: "地図を移動できますがズームはできません",
      mapLockDisabled: "地図ズームロック無効",
      mapLockDisabledDesc: "地図を自由に移動・ズームできます",
      locationLockEnabled: "位置固定有効",
      locationLockEnabledDesc: "現在地が中央に固定され、地図が追従します",
      locationLockDisabled: "位置固定無効",
      locationLockDisabledDesc: "位置固定が無効になりました",
      zoomLockEnabled: "ズームロック有効",
      zoomLockEnabledDesc: "地図のズームが無効になっています",
      zoomLockDisabled: "ズームロック無効",
      zoomLockDisabledDesc: "地図を自由にズームできます",
      mainMemoSet: "メインメモ設定完了",
      mainMemoSetDesc: "このメモが地図に表示されます",
      groupLeaveFailed: "グループ退出失敗",
      groupLeaveFailedDesc: "グループから退出中にエラーが発生しました",
      groupCopySuccess: "グループコピー完了",
      groupCopySuccessDesc: "新しいグループ \"{name}\" が作成され、{count}件のメモがコピーされました（{points}ポイント使用）",
      groupCopyFailed: "グループコピー失敗",
      pointsInsufficient: "ポイント不足",
      memberRemoveSuccess: "メンバー削除完了",
      memberRemoveSuccessDesc: "メンバーがグループから削除されました",
      memberRemoveFailed: "メンバー削除失敗",
      memberRemoveFailedDesc: "メンバー削除中にエラーが発生しました",
      groupUpdateSuccess: "グループ更新完了",
      memosLoadFailed: "メモを読み込めません",
      memosLoadFailedDesc: "しばらくしてから再試行してください",
      groupsLoadFailed: "グループを読み込めません",
      groupsLoadFailedDesc: "しばらくしてから再試行してください",
      notificationPermissionRequired: "通知権限が必要",
      notificationPermissionRequiredDesc: "通知を受信するには設定で通知権限を許可してください",
      notificationPermissionRequestFailed: "通知権限リクエスト失敗",
      notificationPermissionRequestFailedDesc: "通知権限をリクエスト中にエラーが発生しました",
      notificationPermissionRequiredBrowser: "通知権限が必要",
      notificationPermissionRequiredBrowserDesc: "通知を受信するにはブラウザで通知権限を許可してください",
      locationServiceUnavailable: "位置サービス利用不可",
      locationServiceUnavailableDesc: "このブラウザは位置サービスをサポートしていません",
      bulkDeleteSuccess: "{count}件のメモが削除されました",
      googleMapsLoadFailed: "Google Mapsを読み込めません",
      googleMapsLoadFailedDesc: "Google Maps APIキーが設定されていません。Kakao Mapを使用するか、環境変数にVITE_GOOGLE_MAPS_API_KEYを追加してください",
      searchError: "検索エラー",
      searchErrorDesc: "住所検索中にエラーが発生しました。Google Maps APIが正しく読み込まれているか確認してください",
      searchErrorPlaces: "住所検索中にエラーが発生しました。Google Cloud ConsoleでPlaces APIとGeocoding APIを有効にしてください",
      locationMoveComplete: "\"{query}\" の位置に移動しました",
      currentLocationError: "現在地を取得できません",
    },
    // Time
    time: {
      ago: "前",
      justNow: "たった今",
      minutesAgo: "分前",
      hoursAgo: "時間前",
      daysAgo: "日前",
      monthsAgo: "ヶ月前",
      yearsAgo: "年前",
    },
    // Exit Dialog
    exitDialog: {
      title: "アプリを終了",
      description: "本当にアプリを終了しますか？",
      cancel: "キャンセル",
      confirm: "終了",
    },
  },
} as const;

type Translation = {
  nav: {
    map: string;
    memos: string;
    groups: string;
    profile: string;
    settings: string;
  };
  common: {
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    create: string;
    join: string;
    leave: string;
    copy: string;
    close: string;
    yes: string;
    no: string;
    personal: string;
    addressSearchPlaceholder: string;
    locationLockModeActive: string;
    markerFilter: string;
    groupFilter: string;
    allGroups: string;
  };
  categories: {
    all: string;
    default: string;
    travel: string;
    love: string;
    food: string;
    cafe: string;
    shopping: string;
    sport: string;
    work: string;
  };
  colors: {
    blue: string;
    red: string;
    green: string;
    yellow: string;
    purple: string;
    pink: string;
    orange: string;
    teal: string;
  };
  memoForm: {
    newMemo: string;
    editMemo: string;
    buildingName: string;
    buildingNamePlaceholder: string;
    address: string;
    addressPlaceholder: string;
    content: string;
    contentPlaceholder: string;
    photos: string;
    addPhoto: string;
    markerIcon: string;
    groupShare: string;
    selectGroup: string;
    groupsSelected: string;
  };
  memoDetail: {
    photos: string;
    content: string;
    author: string;
    editor: string;
    group: string;
    created: string;
    viewOnMap: string;
    addMemoHere: string;
    confirmDelete: string;
  };
  memoList: {
    noMemos: string;
    noMemosDesc: string;
    noCategoryMemos: string;
    noCategoryMemosDesc: string;
  };
  groups: {
    title: string;
    createGroup: string;
    joinGroup: string;
    newGroup: string;
    editGroup: string;
    groupName: string;
    groupNamePlaceholder: string;
    description: string;
    descriptionPlaceholder: string;
    noDescription: string;
    myName: string;
    myNamePlaceholder: string;
    groupColor: string;
    markerShape: string;
    inviteCode: string;
    inviteCodePlaceholder: string;
    inviteCodeCopied: string;
    leftGroup: string;
    noGroups: string;
    noGroupsDesc: string;
    members: string;
    memberCount: string;
    copyInviteCode: string;
    deleteGroup: string;
    confirmDeleteGroup: string;
    leader: string;
    transferLeadership: string;
    confirmTransferLeadership: string;
    removeMember: string;
    transfer: string;
    remove: string;
    joining: string;
    joinButton: string;
    searchGroups: string;
    searchPlaceholder: string;
    noSearchResults: string;
    noSearchResultsDesc: string;
    searchResultsCount: string;
    canEditGroupMemos: string;
  };
  settings: {
    title: string;
    darkMode: string;
    darkModeDesc: string;
    darkModeEnable: string;
    language: string;
    languageDesc: string;
    font: string;
    fontDesc: string;
    fontFamily: string;
    fontSize: string;
    fontDefault: string;
    fontNotoSans: string;
    fontNanumGothic: string;
    fontGamjaFlower: string;
    fontDokdo: string;
    fontNanumPen: string;
    fontSizeSmall: string;
    fontSizeMedium: string;
    fontSizeLarge: string;
    notifications: string;
    notificationsDesc: string;
    notificationsEnable: string;
    memoNotifications: string;
    memoNotificationsDesc: string;
    proximityRadius: string;
    proximityRadiusDesc: string;
    radius50m: string;
    radius100m: string;
    radius200m: string;
    location: string;
    locationDesc: string;
    locationTracking: string;
    serviceSettings: string;
    displaySettings: string;
    appInfo: string;
    version: string;
    developer: string;
    developerName: string;
    account: string;
    accountInfo: string;
    logout: string;
    logoutDesc: string;
    mapProvider: string;
    mapProviderDesc: string;
    mapProviderKakao: string;
    mapProviderGoogle: string;
    points: string;
    pointsDesc: string;
    currentPointsLabel: string;
    purchasePoints: string;
    purchasePointsTitle: string;
    purchasePointsDesc: string;
    pointsPackage: string;
    canCopyMemos: string;
    popular: string;
    pointsUsageNote: string;
    pointsCharged: string;
    pointsChargedDesc: string;
    authExpired: string;
    authExpiredDesc: string;
    pointsChargeFailed: string;
    pointsChargeFailedDesc: string;
    community: string;
    communityDesc: string;
    visitCommunity: string;
    personalSettings: string;
    personalSettingsDesc: string;
    store: string;
    storeDesc: string;
    customerSupport: string;
    customerSupportDesc: string;
    appInfo: string;
    appInfoDesc: string;
  };
  toast: {
    newMemo: string;
    newMemoDesc: string;
    memoUpdated: string;
    memoUpdatedDesc: string;
    personalSetupFailed: string;
    personalSetupFailedDesc: string;
    memoCreated: string;
    memoCreatedDesc: string;
    memoEditSuccess: string;
    memoEditSuccessDesc: string;
    memoDeleted: string;
    memoDeletedDesc: string;
    groupCreated: string;
    groupCreatedDesc: string;
    groupJoined: string;
    groupJoinedDesc: string;
    groupLeft: string;
    groupLeftDesc: string;
    groupDeleted: string;
    groupDeletedDesc: string;
    leadershipTransferred: string;
    leadershipTransferredDesc: string;
    leadershipTransferError: string;
    deleteSuccess: string;
    deleteError: string;
    viewLocation: string;
    searchNoResults: string;
    searchNoResultsDesc: string;
    searchComplete: string;
    searchCompleteDesc: string;
    searchFailed: string;
    searchFailedDesc: string;
    locationFound: string;
    locationError: string;
    locationErrorDesc: string;
    addressNotFound: string;
    mapLockEnabled: string;
    mapLockEnabledDesc: string;
    mapLockDisabled: string;
    mapLockDisabledDesc: string;
    locationLockEnabled: string;
    locationLockEnabledDesc: string;
    locationLockDisabled: string;
    locationLockDisabledDesc: string;
    zoomLockEnabled: string;
    zoomLockEnabledDesc: string;
    zoomLockDisabled: string;
    zoomLockDisabledDesc: string;
    mainMemoSet: string;
    mainMemoSetDesc: string;
    groupLeaveFailed: string;
    groupLeaveFailedDesc: string;
    groupCopySuccess: string;
    groupCopySuccessDesc: string;
    groupCopyFailed: string;
    pointsInsufficient: string;
    memberRemoveSuccess: string;
    memberRemoveSuccessDesc: string;
    memberRemoveFailed: string;
    memberRemoveFailedDesc: string;
    groupUpdateSuccess: string;
    memosLoadFailed: string;
    memosLoadFailedDesc: string;
    groupsLoadFailed: string;
    groupsLoadFailedDesc: string;
    notificationPermissionRequired: string;
    notificationPermissionRequiredDesc: string;
    notificationPermissionRequestFailed: string;
    notificationPermissionRequestFailedDesc: string;
    notificationPermissionRequiredBrowser: string;
    notificationPermissionRequiredBrowserDesc: string;
    locationServiceUnavailable: string;
    locationServiceUnavailableDesc: string;
    bulkDeleteSuccess: string;
    googleMapsLoadFailed: string;
    googleMapsLoadFailedDesc: string;
    searchError: string;
    searchErrorDesc: string;
    searchErrorPlaces: string;
    locationMoveComplete: string;
    currentLocationError: string;
  };
  time: {
    ago: string;
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    monthsAgo: string;
    yearsAgo: string;
  };
  exitDialog: {
    title: string;
    description: string;
    cancel: string;
    confirm: string;
  };
};

export type TranslationKeys = Translation;

export function getTranslation(language: Language): TranslationKeys {
  return translations[language];
}
