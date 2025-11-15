# Location-Based Memo Sharing App

## Overview

A mobile-first web application enabling users to create and share location-based memos within defined groups. Key features include an interactive map for dropping memos at specific geographic locations, attaching photos, and real-time updates. The application aims to provide a seamless and intuitive experience for collaborative location-based information sharing.

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