# Location-Based Memo Sharing App

## Overview

A mobile-first web application for creating and sharing location-based memos within groups. Users can drop memos at specific geographic locations (buildings/addresses), attach photos, and share them with group members. The app features an interactive map interface powered by Kakao Maps, real-time updates via WebSocket, and a Material Design-inspired UI optimized for mobile devices.

## Recent Changes

### November 2025

**Group Membership Filtering (November 14, 2025)**
- Fixed issue where left groups still appeared in memo form's group sharing section
- Implemented `myMemberIds` synchronization logic that validates membership against fetched groups
- MemoFormSheet now filters groups to only show active memberships
- Added automatic cleanup of stale member IDs from localStorage on page load

**Map Navigation Feature (November 14, 2025)**
- Implemented "지도에서 위치 보기" (View on Map) button in memo detail sheet
- Added `pendingLocation` state to coordinate map navigation when switching tabs
- Map automatically centers and zooms (level 3) to memo location when navigating from other tabs
- useEffect ensures map instance is ready before attempting navigation

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tool**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR and optimized builds
- Wouter for lightweight client-side routing (replacing React Router)

**UI Component System**
- shadcn/ui component library built on Radix UI primitives
- Material Design principles for mobile-optimized layouts
- Tailwind CSS for utility-first styling with custom design tokens
- Roboto font family loaded via Google Fonts CDN
- Material Icons for consistent iconography

**State Management**
- TanStack Query (React Query) for server state management, caching, and data synchronization
- React Hook Form with Zod for type-safe form validation
- Local React state for UI-only concerns (active tabs, modals, etc.)

**Map Integration**
- Kakao Maps SDK for interactive map rendering and geocoding
- Custom colored map markers using CustomOverlay for visual differentiation
  - Group memos display in their group's selected color
  - Personal memos display in purple (#9333ea)
  - 8 preset colors available: blue, red, green, yellow, purple, pink, orange, teal
- Marker click opens memo detail sheet (not creation form)
- Map click (empty space) opens new memo creation form
- User location tracking with geolocation API
- Click-to-place memo functionality with reverse geocoding
- markerClickedRef flag prevents map click event propagation from markers

**Key Design Decisions**
- Mobile-first responsive design with bottom sheet patterns
- Full-screen map as primary interface with overlay sheets for content
- Bottom navigation bar for main app sections (map, memos, groups, settings)
- Floating Action Button (FAB) pattern for quick memo creation
- Touch-optimized components with minimum 48px touch targets

### Backend Architecture

**Server Framework**
- Express.js for HTTP server and REST API endpoints
- TypeScript for type safety across frontend and backend
- ESM module system throughout the stack

**API Design**
- RESTful endpoints for CRUD operations on groups, members, and memos
- Multipart form data handling with Multer for photo uploads
- JSON request/response format
- Shared Zod schemas between client and server for validation consistency

**Database Layer**
- Neon serverless PostgreSQL as the database provider
- Drizzle ORM for type-safe database queries and migrations
- Connection pooling via @neondatabase/serverless
- WebSocket support using ws library for database connections

**Storage Pattern**
- Repository pattern with `IStorage` interface for data access abstraction
- `DatabaseStorage` implementation handles all database operations
- Separation of concerns: routes handle HTTP, storage handles data persistence

**Key Architectural Decisions**
- Shared schema definitions in `/shared` directory accessible to both client and server
- Path aliases configured for clean imports (@/, @shared/)
- Database schema includes soft relationships via foreign keys with cascade deletes
- UUID primary keys generated at database level for distributed system compatibility

### Data Storage

**Database Schema**

Tables:
- `groups`: Group entities with name, unique invite codes, and customizable color (varchar, default '#3b82f6')
- `members`: Users who belong to groups (membership model)
- `memos`: Location-based notes with coordinates, content, and building information
- `photos`: Image attachments linked to memos

Key Relationships:
- Groups have many members (one-to-many)
- Groups have many memos (one-to-many with optional relationship)
- Memos belong to one member (many-to-one)
- Memos have many photos (one-to-one)
- Cascade deletes ensure referential integrity

**Schema Design Rationale**
- Denormalized building name and address in memos for performance (avoids geocoding on every read)
- Separate photos table allows multiple images per memo
- Optional group relationship on memos supports both personal and shared memos
- Member-based authorship (not user accounts) simplifies onboarding
- Group color field enables visual differentiation of memos on the map

### Real-Time Communication

**WebSocket Implementation**
- WebSocket server runs alongside Express HTTP server
- Real-time notifications for memo creation and deletion
- Automatic query invalidation triggers UI updates across connected clients
- Protocol and host detection for proper ws:// vs wss:// connection

**Use Cases**
- Broadcast new memos to all connected group members
- Notify on memo deletions
- Enable collaborative memo browsing without manual refresh

### External Dependencies

**Third-Party Services**
- **Kakao Maps API**: Map rendering, geocoding, and reverse geocoding services (requires VITE_KAKAO_API_KEY)
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support
- **Google Fonts CDN**: Roboto font family delivery
- **Material Icons**: Icon font from Google

**Key Libraries**
- **Radix UI**: Accessible, unstyled component primitives for dialogs, sheets, forms, etc.
- **Drizzle ORM**: Type-safe SQL query builder with schema-first design
- **Zod**: Runtime type validation and schema definition
- **TanStack Query**: Async state management with caching
- **date-fns**: Date formatting and manipulation (with Korean locale support)
- **Multer**: Multipart form parsing for file uploads
- **ws**: WebSocket implementation for Node.js

**Development Tools**
- **Vite plugins**: Runtime error overlay, Replit-specific development features
- **TypeScript**: Static type checking across the entire codebase
- **ESBuild**: Production bundling for server code
- **Drizzle Kit**: Database migration management

**Configuration Notes**
- Environment variable `DATABASE_URL` required for PostgreSQL connection
- Environment variable `VITE_KAKAO_API_KEY` required for map functionality
- File upload limits: 5MB max size, restricted to image formats (JPEG, PNG, GIF, WebP)