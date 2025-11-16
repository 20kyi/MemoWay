# Location-Based Memo Sharing App

## Overview

A mobile-first web application enabling users to create and share location-based memos within defined groups. Key features include an interactive map for dropping memos at specific geographic locations, attaching photos, and real-time updates. The application aims to provide a seamless and intuitive experience for collaborative location-based information sharing.

## Recent Changes (November 16, 2025)

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

The database schema includes `groups`, `members`, `memos`, and `photos` tables. Relationships are designed with cascade deletes to maintain integrity. Memos can be personal or group-assigned. Denormalization is used for performance, and a separate photos table allows multiple images per memo.

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

### Configuration Notes
- Requires `DATABASE_URL` and `VITE_KAKAO_API_KEY` environment variables.
- File uploads are limited to 5MB and image formats.