# Design Guidelines: 위치 기반 메모 공유 앱

## Design Approach
**System:** Material Design (mobile-optimized)
**Rationale:** Utility-focused productivity tool requiring familiar mobile patterns, clear information hierarchy, and efficient navigation. Material Design provides proven mobile-first components ideal for map-based applications.

## Typography System
- **Primary Font:** Roboto (via Google Fonts CDN)
- **Headings:** Roboto Medium (500)
  - H1: text-2xl (건물 이름, 그룹 제목)
  - H2: text-xl (섹션 헤더)
  - H3: text-lg (카드 제목)
- **Body:** Roboto Regular (400)
  - Default: text-base
  - Small: text-sm (메타데이터, 타임스탬프)
  - Extra small: text-xs (보조 정보)
- **Buttons/Labels:** Roboto Medium (500), text-sm

## Layout System
**Spacing Units:** Tailwind 2, 4, 8 (p-2, p-4, p-8, m-2, m-4, gap-4 등)
- Component padding: p-4
- Section spacing: py-8, gap-6
- Card spacing: p-4, gap-3
- Icon/button touch targets: min-h-12, min-w-12

**Container Structure:**
- Full-width map container (h-screen 활용)
- Bottom sheet overlays: max-h-[80vh], rounded-t-3xl
- List views: px-4, py-6
- Safe areas: pb-safe for mobile bottom navigation

## Core Components

### 1. Map Interface (Primary Screen)
- Full-screen map container (100vh minus navigation)
- Floating action button (FAB): 메모 추가, bottom-right, size-16, rounded-full, shadow-lg
- Custom markers: Building pins with memo count badges
- User location indicator: Pulsing circle marker
- Zoom controls: Bottom-left, stacked vertically, gap-2

### 2. Bottom Navigation Bar
- Fixed bottom navigation: h-16, border-t, safe-area-inset-bottom
- 4 tabs: 지도, 메모 목록, 그룹, 설정
- Icons from Material Icons CDN
- Active state: Icon with label (text-xs)
- Touch target: min-h-12

### 3. Memo Cards (List View)
- Card structure: rounded-2xl, shadow-md, p-4, gap-3
- Header: 건물명 (text-lg font-medium) + 거리 표시 (text-sm)
- Thumbnail grid: 2-3 images, rounded-lg, aspect-square, gap-2
- Content preview: text-sm, line-clamp-2
- Footer: 작성일시, 그룹 badge (if shared)
- Swipe actions: Edit/Delete (mobile gesture pattern)

### 4. Memo Creation Bottom Sheet
- Slide-up modal: rounded-t-3xl, p-6, max-h-[90vh]
- Drag handle: w-12, h-1, rounded-full, mx-auto, mb-4
- Form sections: gap-6
  - 건물 선택 (auto-filled from map tap)
  - 사진 업로드 grid: grid-cols-3, gap-2, aspect-square
  - 메모 입력: rounded-xl, p-4, min-h-32
  - 그룹 공유 선택: Checkbox list
- Action buttons: Fixed bottom, gap-3, full-width

### 5. Group Management
- Group cards: p-4, rounded-2xl, border, gap-3
  - Header: 그룹명 + 멤버 수 (avatar stack)
  - Recent memos: Small preview cards
  - Share link button: outlined style
- Create group modal: Centered, max-w-md, p-6, rounded-3xl
- Member list: Avatar + name rows, gap-2

### 6. Notification Panel
- Toast-style notifications: Top of screen, rounded-2xl, p-4, shadow-xl
- Building proximity alert: Icon + "근처 메모 있음" + 건물명
- Auto-dismiss: 5초 후 또는 tap to dismiss
- Action: "메모 보기" button (text-sm)

### 7. Building Detail View
- Header image: aspect-video, rounded-t-2xl (if photo exists)
- Building info: p-4, gap-2 (주소, 카테고리)
- Memo timeline: Reverse chronological, gap-4
  - Each memo: border-l-4, pl-4, py-3
  - Author avatar + name (if group memo)
  - Photo grid (if exists)
  - Full memo text
  - Timestamp

## Touch Interactions
- All buttons/tappable elements: min-h-12, min-w-12
- Swipe gestures: Card swipe for delete/edit
- Pull-to-refresh: Map and list views
- Pinch-to-zoom: Map interface (native)
- Long-press: Map 위치에서 메모 추가

## Navigation Patterns
- Primary: Bottom tab navigation (always visible)
- Secondary: Top app bar with back button (detail views)
- Map controls: Floating buttons (FAB pattern)
- Modals: Bottom sheets (slide-up) for forms
- Full-screen: Map view, 메모 상세

## Icons
**Library:** Material Icons (via CDN)
- map, add_circle, list, group, settings
- photo_camera, notifications, location_on
- edit, delete, share, check_circle

## Responsive Behavior
- **Mobile (base):** Single column, full-width components
- **Tablet (md:):** 2-column lists, larger map controls
- **Desktop (lg:):** Sidebar + map split view (if accessed on desktop)

## Accessibility
- Touch targets: Minimum 44x44px
- Form labels: Associated with inputs
- Map markers: aria-labels with building names
- Keyboard navigation: Full support for desktop users
- Screen reader: Announce location changes, new memos

## Critical Mobile Optimizations
- Lazy load: Memo images, infinite scroll for lists
- Geolocation API: Background tracking with user permission
- Progressive Web App: Installable, offline-capable
- Performance: Virtualized lists for large memo counts
- Native features: Camera access, push notifications (Web API)