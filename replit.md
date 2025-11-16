# Location-Based Memo Sharing App

## Overview

A mobile-first web application enabling users to create and share location-based memos within defined groups. Key features include an interactive map for dropping memos at specific geographic locations, attaching photos, and real-time updates. The application aims to provide a seamless and intuitive experience for collaborative location-based information sharing.

## Recent Changes (November 16, 2025)

**Implemented User Authentication with Replit Auth**
- User request: Add app-native login (email/password) + Kakao OAuth login
- Implementation:
  - **Database Schema**: Added `users` and `sessions` tables
    - users table: id, email, firstName, lastName, profileImageUrl, provider (replit/kakao), kakaoId, createdAt, updatedAt
    - sessions table: sid, sess (JSON), expire (for express-session with PostgreSQL)
    - members table: Added userId column to link authenticated users with group members
  - **Server-Side Auth** (`server/replitAuth.ts`):
    - Replit Auth using OpenID Connect (passport + openid-client)
    - Supports email/password, Google, GitHub, Apple logins automatically
    - Session management with connect-pg-simple (PostgreSQL session store)
    - `isAuthenticated` middleware to protect routes
    - Automatic user upsert on login (creates or updates user record)
  - **Storage Layer** (`server/storage.ts`):
    - Added user CRUD operations: getUser, upsertUser, getUserByEmail, getUserByKakaoId
    - Member creation now includes userId to link users with their group memberships
  - **API Routes** (`server/routes.ts`):
    - All API routes protected with isAuthenticated middleware
    - `/api/auth/user` returns current user info
    - `/api/login`, `/api/callback`, `/api/logout` handle authentication flow
    - Group and member creation automatically associates userId with created members
  - **Client-Side Auth**:
    - `useAuth` hook (`client/src/hooks/useAuth.ts`): Returns user, isLoading, isAuthenticated
    - `authUtils` (`client/src/lib/authUtils.ts`): Helper to detect 401 errors
    - Landing page (`client/src/pages/landing.tsx`): Shows when user is not authenticated
    - App.tsx: Conditional rendering - landing page for logged-out users, home page for authenticated users
  - **Landing Page**: Multi-language support with features overview and login button
- Authentication flow: Landing page → /api/login → Replit Auth → /api/callback → Home page
- Member-User relationship: One user can have multiple members (different names in different groups)
- Environment variables required: SESSION_SECRET, REPL_ID (ISSUER_URL optional, defaults to https://replit.com/oidc)
- **Kakao OAuth Integration** (`server/kakaoAuth.ts`):
  - Complete OAuth 2.0 flow with Kakao API
  - Token exchange and user info retrieval from Kakao
  - User upsert with kakaoId and provider='kakao'
  - Dedicated yellow Kakao login button on landing page
  - Routes: `/api/kakao/login`, `/api/kakao/callback`
  - Requires KAKAO_CLIENT_ID and KAKAO_CLIENT_SECRET environment variables

**Completed Full App Translation (Korean, English, Chinese, Japanese)**
- User request: Complete translation of entire app into 4 languages
- Implementation:
  - **Translation System**: Created comprehensive i18n system in `client/src/lib/translations.ts`
    - Organized by sections: nav, common, memoForm, memoDetail, memoList, groups, settings, categories, colors, markers, toast, time
    - All user-facing text translated into 한국어 (ko), English (en), 中文 (zh), 日本語 (ja)
  - **Language Context**: LanguageContext in `client/src/lib/language-context.tsx`
    - Provides `useLanguage()` hook with { t, language, setLanguage }
    - `t` object contains all translations for current language
    - Language preference persisted in localStorage (key: "language", default: "ko")
    - LanguageProvider wraps entire app in App.tsx
  - **Translated Components**:
    - BottomNav: Navigation labels (Map, Memos, Groups, Settings)
    - SettingsView: All settings labels and descriptions
    - MemoList: Category labels, empty states, filter dropdown
    - MemoFormSheet: Form labels, placeholders, buttons, category names
    - MemoDetailSheet: Content labels, action buttons, confirmations
    - GroupManagement: Form labels, placeholders, buttons, color names, marker shapes, toast messages
    - Home: All toast notification messages (create, update, delete, join, leave)
  - **Date Formatting**: Integrated date-fns locales (ko, enUS, zhCN, ja) for proper date display
  - **Form Validation**: Zod schemas use translated error messages
  - **Dynamic Updates**: All UI elements update instantly when language changes
- UI: Language selector in Settings with flag emojis (🇰🇷 한국어, 🇺🇸 English, 🇨🇳 中文, 🇯🇵 日本語)
- Testing: E2E test verified language switching works across all 4 languages and persists after page refresh

**Added Category Filter to Memo List Page**
- User request: Add category filtering functionality to the memo list as a dropdown
- Implementation:
  - Added Select dropdown component at top of memo list
  - Single dropdown button showing: current category icon + label + count badge
  - Dropdown options for each category: 전체, 여행, 사랑, 맛집, 카페, 쇼핑, 운동, 업무
  - Each dropdown item displays icon, label, and count badge
  - Only categories with memos are shown in dropdown options
  - Icons for each category (MapPin, Plane, Heart, UtensilsCrossed, Coffee, ShoppingBag, Dumbbell, Briefcase)
- Filtering logic: Filters memos by markerIcon field
- Empty state: Shows appropriate message when selected category has no memos
- UI: Clean single-button design that expands to show all available categories

**Updated Current Location Button Icon to Paper Plane**
- User request: Change the floating button icon on the map to a paper plane (Send icon)
- Changed from Navigation icon to Send icon (lucide-react)
- Button positioned in bottom-right (bottom-20 right-4, z-50)
- Moved button from MapView to home.tsx to fix visibility issues caused by overflow-hidden
- Circular design with shadow, 48px x 48px
- Functionality: Clicking moves map to user's current GPS location using navigator.geolocation
- Button appears 16px above bottom navigation bar (nav bar is h-16 = 64px, button is bottom-20 = 80px)

**Added "새 메모 추가" Button to Memo Detail View**
- User request: Add button to create new memo at same location from detail view
- Implementation:
  - Added "새 메모 추가" button in MemoDetailSheet (positioned above "지도에서 위치 보기")
  - Clicking button opens memo creation form with pre-filled location data
  - Location info (latitude, longitude, address, buildingName) automatically populated from current memo
- Button order in detail sheet: 새 메모 추가 → 지도에서 위치 보기 → 수정 → 삭제
- Enables easy creation of multiple memos at the same location

**Removed Duplicate Close Button from Memo Detail Title Area**
- User request: Remove redundant X button next to memo title
- Simplified detail sheet header by removing title-adjacent close button
- Users can still close sheet using default sheet close mechanism

**Removed "새 메모 추가" Button from Cluster Views**
- Earlier requirement: When clicking existing memo locations, show only memo details
- MemoClusterSheet displays only memo list without creation button
- Empty map clicks still open creation form as expected

**Fixed Marker Click Opening Both Detail and Creation Forms**
- Root cause: Kakao Maps click events and DOM click events executed in unpredictable order
- Solution: Added 50ms delay in map click handler to allow marker clicks to set flag first
- Result: Marker clicks consistently open detail view only, empty clicks open creation form only

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with **React 18** and **TypeScript**, using **Vite** for tooling. UI components leverage **shadcn/ui** (based on Radix UI) and **Tailwind CSS** for styling, adhering to **Material Design** principles for a mobile-first experience. **Wouter** handles client-side routing. State management relies on **TanStack Query** for server state, **React Hook Form** with **Zod** for form validation, and local React state for UI concerns. **Kakao Maps SDK** is integrated for interactive maps, custom colored markers (group-specific, personal in purple), and geocoding services. The design prioritizes full-screen map interaction, bottom navigation, and touch-optimized components.

### Backend Architecture

The backend utilizes **Express.js** with **TypeScript** and ESM modules, providing a **RESTful API** for CRUD operations on groups, members, and memos. **Multer** handles photo uploads. **Neon serverless PostgreSQL** is the primary database, accessed via **Drizzle ORM** for type-safe queries. A **Repository pattern** abstracts data access. Key architectural decisions include shared Zod schemas between client and server, path aliases, and UUID primary keys.

### Data Storage

The database schema includes `users`, `sessions`, `groups`, `members`, `memos`, and `photos` tables. Relationships are designed with cascade deletes to maintain integrity. Memos can be personal or group-assigned. Denormalization is used for performance, and a separate photos table allows multiple images per memo.

**Authentication Tables**:
- `users`: Stores authenticated user information (id, email, firstName, lastName, profileImageUrl, provider, kakaoId)
- `sessions`: PostgreSQL-backed session storage for Passport.js
- `members`: Now includes userId foreign key to link group members with authenticated users

One user can have multiple members (different names/roles in different groups). All members created by a user are linked via the userId column.

### Real-Time Communication

A **WebSocket server** runs alongside the Express HTTP server, powered by the `ws` library. It facilitates real-time notifications for memo creation and deletion, ensuring UI updates across connected clients without manual refresh.

## External Dependencies

### Third-Party Services
- **Kakao Maps API**: Map rendering, geocoding, and reverse geocoding.
- **Neon Database**: Serverless PostgreSQL hosting.
- **Google Fonts CDN**: Delivers Roboto font.
- **Material Icons**: Provides iconography.

### Key Libraries
- **Radix UI**: Accessible, unstyled component primitives.
- **Drizzle ORM**: Type-safe SQL query builder.
- **Zod**: Runtime type validation and schema definition.
- **TanStack Query**: Asynchronous state management and caching.
- **date-fns**: Date formatting and manipulation.
- **Multer**: Multipart form parsing for file uploads.
- **ws**: WebSocket implementation for Node.js.

### Authentication System

The app uses **Replit Auth** (OpenID Connect) for primary authentication, providing email/password, Google, GitHub, Apple login options automatically. Authentication is session-based using express-session with PostgreSQL storage.

**Authentication Flow**:
1. Unauthenticated users see landing page
2. Click "로그인 / 회원가입" redirects to `/api/login`
3. Replit Auth handles authentication
4. Callback to `/api/callback` creates/updates user record and session
5. User redirected to home page with authenticated session

All API routes are protected with `isAuthenticated` middleware, ensuring only authenticated users can access the application.

### Configuration Notes
- Requires `DATABASE_URL`, `SESSION_SECRET`, `REPL_ID`, `VITE_KAKAO_API_KEY`, `KAKAO_CLIENT_ID`, and `KAKAO_CLIENT_SECRET` environment variables.
- Optional: `ISSUER_URL` (defaults to https://replit.com/oidc)
- File uploads are limited to 5MB and image formats.
- Sessions table auto-creates on first run (connect-pg-simple with createTableIfMissing: true)