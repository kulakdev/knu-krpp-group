# Контекстна та компонентна схеми

## Контекстна схема (System Context Diagram)

```mermaid
flowchart TD
    User([Student / Lecturer]) -->|Books slots, cancels bookings| App[University Room Booking Service]
    Admin([Administrator]) -->|Approves/rejects >100 cap bookings| App

    subgraph System Boundary
        App
    end

    App -->|Reads and writes booking state| DB[(PostgreSQL Database)]
```

## Схема компонентів (Component Diagram)

Matches `v2.0`. Folder names are the real ones in the repository.

```mermaid
flowchart TB
    subgraph Browser [Browser — client components]
        Pages["Pages: app/page.tsx (dashboard),<br/>app/admin/page.tsx (v2.0)"]
        Blocks["app/components/** — user switcher, interval and<br/>equipment pickers, rooms table, my bookings;<br/>app/admin/components/** — pending requests"]
        Store["store/** — mock user (persisted), dashboard state"]
        ApiClient["api-client/** — requests + React Query hooks<br/>(rooms, bookings, admin); http.ts sets x-user-id"]
    end

    subgraph NextApp [Next.js application — server]
        subgraph Routes [Route handlers app/api/** — transport only]
            RoomRoutes["GET /api/rooms"]
            BookingRoutes["GET, POST /api/bookings<br/>DELETE /api/bookings/:id"]
            AdminRoutes["GET /api/admin/bookings<br/>POST /api/admin/bookings/:id/approve | reject (v2.0)"]
            Health["GET /api/health"]
        end

        subgraph Cross [Cross-cutting]
            ApiHandler["lib/api — apiHandler: error mapping,<br/>x-request-id, operation log (lib/logger)"]
            Auth["lib/auth — getCurrentUser (x-user-id)"]
        end

        subgraph Services [Business logic]
            BookingService["lib/booking-service — createBooking (row lock),<br/>listRooms, cancelBooking, decideBooking,<br/>listPendingBookings (admin check)"]
            State["lib/booking-state — transitions,<br/>BLOCKING_STATUSES, initialStatus"]
            Intervals["lib/intervals — [start, end) rules"]
        end

        Prisma["Prisma Client (lib/prisma)"]
    end

    Postgres[(PostgreSQL 16)]

    Pages --> Blocks
    Blocks --> Store
    Blocks --> ApiClient
    ApiClient --> RoomRoutes
    ApiClient --> BookingRoutes
    ApiClient --> AdminRoutes

    RoomRoutes --> ApiHandler
    BookingRoutes --> ApiHandler
    AdminRoutes --> ApiHandler
    Health --> ApiHandler
    BookingRoutes --> Auth
    AdminRoutes --> Auth

    RoomRoutes --> BookingService
    BookingRoutes --> BookingService
    AdminRoutes --> BookingService
    BookingService --> State
    BookingService --> Intervals
    BookingService --> Prisma
    Auth --> Prisma
    Health --> Prisma
    Prisma --> Postgres
```

## Діаграма послідовності: створення бронювання (Sequence Diagram)

Required by lab Section 5. Covers the booking creation path, including the concurrency conflict branch governed by ADR-001 and the v2.0 initial status.

```mermaid
sequenceDiagram
    actor U as User (Student)
    participant UI as Browser UI
    participant API as POST /api/bookings
    participant Auth as lib/auth
    participant Svc as lib/booking-service
    participant DB as PostgreSQL

    U->>UI: Pick room + interval, click "Book"
    UI->>API: POST /api/bookings (x-user-id, roomId, startTime, endTime)
    API->>Auth: getCurrentUser(req)
    Auth->>DB: find user by x-user-id
    Auth-->>API: user (or 401 Unauthorized)
    API->>Svc: createBooking(user, roomId, start, end)
    Svc->>Svc: validate startTime < endTime (else 400)
    Svc->>DB: BEGIN; SELECT id, capacity FROM room FOR UPDATE (404 if none)
    Svc->>DB: find overlapping bookings in BLOCKING_STATUSES [ACTIVE, PENDING], [start, end)
    alt No overlap
        Svc->>DB: INSERT booking (status = initialStatus: ACTIVE, or PENDING if capacity > 100); COMMIT
        Svc-->>API: booking
        API-->>UI: 201 Created
    else Overlap exists
        Svc->>DB: ROLLBACK
        Svc-->>API: ConflictError
        API-->>UI: 409 Conflict
    end
```
