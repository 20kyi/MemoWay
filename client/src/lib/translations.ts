import type { Language } from "./language-context";

export const translations = {
  ko: {
    // Navigation
    nav: {
      map: "지도",
      memos: "메모",
      groups: "그룹",
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
      searchGroups: "그룹 검색",
      searchPlaceholder: "그룹 이름 또는 설명으로 검색...",
      noSearchResults: "검색 결과가 없습니다",
      searchResultsCount: "개의 그룹을 찾았습니다",
      canEditGroupMemos: "그룹 메모 수정 권한",
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
      notificationsDesc: "근처 메모가 있을 때 알림을 받습니다",
      notificationsEnable: "알림 활성화",
      proximityRadius: "알림 반경",
      proximityRadiusDesc: "이 거리 이내의 메모가 있으면 알림을 받습니다",
      radius50m: "50미터",
      radius100m: "100미터",
      radius200m: "200미터",
      location: "위치",
      locationDesc: "현재 위치를 추적하여 근처 메모를 알려줍니다",
      locationTracking: "위치 추적",
      appInfo: "앱 정보",
      version: "버전",
      developer: "개발자",
      developerName: "Location Memo Team",
      account: "계정",
      accountInfo: "로그인된 계정 정보",
      logout: "로그아웃",
      logoutDesc: "현재 계정에서 로그아웃합니다",
      mapProvider: "지도 프로바이더",
      mapProviderDesc: "사용할 지도 서비스를 선택하세요",
      mapProviderKakao: "카카오맵",
      mapProviderGoogle: "구글맵",
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
  },
  en: {
    // Navigation
    nav: {
      map: "Map",
      memos: "Memos",
      groups: "Groups",
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
      searchGroups: "Search Groups",
      searchPlaceholder: "Search by name or description...",
      noSearchResults: "No search results",
      searchResultsCount: " groups found",
      canEditGroupMemos: "Can edit group memos",
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
      notificationsDesc: "Receive notifications when there are nearby memos",
      notificationsEnable: "Enable Notifications",
      proximityRadius: "Notification Radius",
      proximityRadiusDesc: "Get notified when memos are within this distance",
      radius50m: "50 meters",
      radius100m: "100 meters",
      radius200m: "200 meters",
      location: "Location",
      locationDesc: "Track your current location to notify nearby memos",
      locationTracking: "Location Tracking",
      appInfo: "App Information",
      version: "Version",
      developer: "Developer",
      developerName: "Location Memo Team",
      account: "Account",
      accountInfo: "Logged in account information",
      logout: "Log Out",
      logoutDesc: "Sign out from your current account",
      mapProvider: "Map Provider",
      mapProviderDesc: "Select the map service to use",
      mapProviderKakao: "Kakao Map",
      mapProviderGoogle: "Google Maps",
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
  },
  zh: {
    // Navigation
    nav: {
      map: "地图",
      memos: "备忘录",
      groups: "群组",
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
      searchGroups: "搜索群组",
      searchPlaceholder: "按名称或说明搜索...",
      noSearchResults: "无搜索结果",
      searchResultsCount: "个群组",
      canEditGroupMemos: "可编辑群组备忘录",
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
      notificationsDesc: "当附近有备忘录时接收通知",
      notificationsEnable: "启用通知",
      proximityRadius: "通知半径",
      proximityRadiusDesc: "当备忘录在此距离内时接收通知",
      radius50m: "50米",
      radius100m: "100米",
      radius200m: "200米",
      location: "位置",
      locationDesc: "跟踪您的当前位置以通知附近的备忘录",
      locationTracking: "位置跟踪",
      appInfo: "应用信息",
      version: "版本",
      developer: "开发者",
      developerName: "Location Memo Team",
      account: "账户",
      accountInfo: "已登录账户信息",
      logout: "退出登录",
      logoutDesc: "从当前账户退出登录",
      mapProvider: "地图提供商",
      mapProviderDesc: "选择要使用的地图服务",
      mapProviderKakao: "Kakao地图",
      mapProviderGoogle: "Google地图",
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
  },
  ja: {
    // Navigation
    nav: {
      map: "地図",
      memos: "メモ",
      groups: "グループ",
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
      searchGroups: "グループを検索",
      searchPlaceholder: "名前または説明で検索...",
      noSearchResults: "検索結果がありません",
      searchResultsCount: "個のグループ",
      canEditGroupMemos: "グループメモの編集権限",
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
      notificationsDesc: "近くにメモがあるときに通知を受け取ります",
      notificationsEnable: "通知を有効にする",
      proximityRadius: "通知半径",
      proximityRadiusDesc: "この距離内のメモがあるときに通知を受け取ります",
      radius50m: "50メートル",
      radius100m: "100メートル",
      radius200m: "200メートル",
      location: "位置情報",
      locationDesc: "現在地を追跡して近くのメモを通知します",
      locationTracking: "位置追跡",
      appInfo: "アプリ情報",
      version: "バージョン",
      developer: "開発者",
      developerName: "Location Memo Team",
      account: "アカウント",
      accountInfo: "ログイン中のアカウント情報",
      logout: "ログアウト",
      logoutDesc: "現在のアカウントからログアウトします",
      mapProvider: "地図プロバイダー",
      mapProviderDesc: "使用する地図サービスを選択してください",
      mapProviderKakao: "Kakao地図",
      mapProviderGoogle: "Google地図",
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
  },
} as const;

type Translation = {
  nav: {
    map: string;
    memos: string;
    groups: string;
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
    searchGroups: string;
    searchPlaceholder: string;
    noSearchResults: string;
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
    proximityRadius: string;
    proximityRadiusDesc: string;
    radius50m: string;
    radius100m: string;
    radius200m: string;
    location: string;
    locationDesc: string;
    locationTracking: string;
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
};

export type TranslationKeys = Translation;

export function getTranslation(language: Language): TranslationKeys {
  return translations[language];
}
