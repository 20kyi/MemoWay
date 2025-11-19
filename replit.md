# Location-Based Memo Sharing App

## Overview

This mobile-first web application facilitates the creation and sharing of location-based memos within user-defined groups. It features an interactive map for dropping memos at specific geographic locations, attaching photos, and real-time updates. The application's core purpose is to provide a seamless and intuitive experience for collaborative location-based information exchange, catering to both personal and group-based memory keeping. The vision is to offer a highly localized social platform for sharing experiences and information.

## User Preferences

Preferred communication style: Simple, everyday language.
Preferred language: Korean (한국어) - All task explanations and communication should be in Korean.

## System Architecture

### UI/UX Decisions

The frontend is designed for a mobile-first experience, following modern design principles with a clean and professional aesthetic. It prioritizes full-screen map interaction, intuitive bottom navigation, and touch-optimized components. Key UI elements include an interactive map with custom colored markers (group-specific, personal in purple), a language selector with flag emojis, floating action buttons for quick map filtering, and a single-button category filter for memo lists. The application supports full translation into Korean, English, Chinese, and Japanese.

**Design System**: The UI features a modern, minimalist design with:
- **Color Palette**: Professional indigo-based primary color (#6366f1) with subtle neutral backgrounds for a sophisticated look
- **Typography**: Clean, semibold headings with proper hierarchy and readable body text
- **Spacing**: Consistent spacing using Tailwind's spacing scale for visual rhythm
- **Shadows**: Subtle elevation shadows (shadow-sm, shadow-md) for depth without being distracting
- **Borders**: Single-pixel borders with subtle colors for clean separation
- **Rounded Corners**: Moderate border radius (rounded-lg) for a modern but not overly rounded appearance
- **Card Design**: Simple, flat card components with hover effects for interactivity
- **Interactive Elements**: Minimal hover states with subtle background changes for better UX

**Map Filtering Interface**: Two floating action buttons (FABs) are positioned in the bottom-right corner of the map view, providing quick access to filtering controls:
- **Group Filter Button** (Users icon): Opens a dialog to filter memos by group (all groups, personal memos, or specific group)
- **Marker Filter Button** (Filter icon): Opens a dialog to filter memos by category (all, travel, love, food, cafe, shopping, sport, work)
- Both buttons display a badge indicator when a filter is active (not showing "all")
- Positioned with `fixed` placement at `bottom-20 right-4` to stay above the bottom navigation bar
- z-index of 50 ensures visibility above other UI elements

### Technical Implementations

The frontend is built with React 18 and TypeScript, using Vite for tooling. UI components are developed with shadcn/ui (based on Radix UI) and styled with Tailwind CSS. Client-side routing is managed by Wouter. State management utilizes TanStack Query for server state, React Hook Form with Zod for form validation, and local React state for UI specifics.

**Map Provider System**: The application supports both Kakao Maps and Google Maps through a switchable provider system:
- **MapProviderContext**: React context managing map provider selection (kakao/google) with localStorage persistence
- **Kakao Maps SDK**: Integrated for Korean-optimized map rendering, custom markers, and geocoding
- **Google Maps SDK**: Integrated via `@googlemaps/js-api-loader` with marker and places libraries for global coverage
- **Conditional Rendering**: Home page renders MapView (Kakao) or GoogleMapView (Google) based on user preference
- **Provider-Aware Navigation**: Map navigation functions (moveToLocation, pendingLocation) handle both providers' APIs
- **Settings UI**: Radio button interface in settings allows users to switch between providers
- Both map views implement identical features: markers, clustering, filtering, location lock, address search

The backend uses Express.js with TypeScript and ESM modules, providing a RESTful API. Multer handles photo uploads. A WebSocket server, built with `ws`, provides real-time notifications for memo creation and deletion, ensuring UI synchronization across clients.

### Feature Specifications

- **Location-Based Memos**: Users can create memos pinned to specific geographic locations on an interactive map.
- **Group Sharing**: Memos can be shared within defined groups, with filtering capabilities by category and group.
- **Photo Attachments**: Memos support photo attachments.
- **Real-time Updates**: WebSocket-driven real-time notifications for memo changes.
- **Memo Copying**: Ability to copy all memos from any group to a user's personal memos.
- **Multi-language Support**: Complete translation for Korean, English, Chinese, and Japanese.
- **Memo List Filtering**: Filter memos by category on the memo list page.
- **Quick Memo Creation**: Option to add new memos at the same location directly from a memo's detail view.
- **Map Marker Filtering**: Dual filter system (marker icon + group) to show only selected categories and groups on the map.
- **Multi-Selection and Bulk Delete**: Long-press (500ms) to enter selection mode, select multiple memos with checkboxes, and delete them all at once.
- **Group Leader Permissions**: Comprehensive role-based access control system with group leaders having special authority to delete groups, remove members, regenerate invite codes, and transfer leadership. Leaders are visually distinguished with crown badges in the UI.
- **Group Member Limit**: Each group has a maximum member capacity of 20 people. The system validates member count on join requests and displays current/max member counts in the group UI.
- **High-Precision GPS**: Automatic GPS positioning on map load with accuracy verification. The system attempts up to 3 times to obtain GPS coordinates with ≤30m accuracy using `enableHighAccuracy: true`, 10-second timeout, and zero cache age. Only positions meeting the 30m threshold are used for map centering and location tracking, ensuring precise memo placement and proximity notifications.

### System Design Choices

The architecture employs a Repository pattern for data access and utilizes shared Zod schemas for validation between client and server. UUIDs are used for primary keys. Database schema includes `users`, `sessions`, `groups`, `members`, `memos`, and `photos` tables, with relationships designed for data integrity via cascade deletes. Denormalization is used for performance where appropriate. A user can be associated with multiple members (different names/roles) across various groups through a `userId` foreign key in the `members` table.

**Security Architecture**: All group-related API endpoints use scoped storage helpers (`getGroupForUser`, `getGroupById`) to ensure users can only access groups where they are members. Role-based access control (RBAC) is enforced via `requireLeaderRole` and `checkMemberRole` helper methods. The `members` table includes a `role` field ('leader'|'member') with the group creator automatically assigned leader status. All data queries are scoped to authenticated users to prevent cross-tenant data exposure.

## External Dependencies

### Third-Party Services
- **Kakao Maps API**: For map rendering, geocoding, and reverse geocoding functionalities (Korean-optimized).
- **Google Maps API**: For global map coverage with marker and places libraries. Requires `VITE_GOOGLE_MAPS_API_KEY` environment variable.
- **Neon Database**: Serverless PostgreSQL hosting for all application data.
- **Google Fonts CDN**: Delivers the Roboto font used in the application.

### Key Libraries
- **Radix UI**: Provides accessible, unstyled component primitives for building the UI.
- **Drizzle ORM**: Used for type-safe SQL query building and database interactions.
- **Zod**: For runtime type validation and schema definition across the stack.
- **TanStack Query**: Manages asynchronous server state, caching, and data synchronization.
- **date-fns**: For date formatting and manipulation, with locale support for translations.
- **Multer**: Handles multipart/form-data, primarily for file uploads.
- **ws**: Implements WebSocket functionality for real-time communication.

### Authentication System
- **Replit Auth (OpenID Connect)**: Primary authentication provider, supporting email/password, Google, GitHub, and Apple logins.
- **Kakao OAuth**: Integrated for specific Kakao account login.
- **connect-pg-simple**: PostgreSQL store for `express-session` to manage user sessions.