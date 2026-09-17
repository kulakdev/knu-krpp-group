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

```mermaid
flowchart TB
    subgraph Client Browser
        UI_Search[Room Search View]
        UI_Bookings[My Bookings View]
        UI_Admin[Admin Approval Panel v2.0]
        UI_Auth[Mock Auth Switcher]
    end

    subgraph Next.js Monolith [Next.js Application Boundary]
        subgraph Routing & Controllers [Route Handlers]
            AuthGuard[Auth & Role Guard]
            RoomRoutes["/api/rooms"]
            BookingRoutes["/api/bookings"]
            AdminRoutes["/api/bookings/:id/review"]
        end

        subgraph Core Business Logic [Services]
            IntervalEngine[Interval & Overlap Engine]
            ApprovalEngine[Approval Workflow Engine v2.0]
            LockManager[Transaction & Concurrency Lock]
        end

        subgraph Data Access Layer
            Prisma[Prisma Client ORM]
        end
    end

    subgraph Infrastructure
        Postgres[(PostgreSQL 16 Engine)]
    end

    %% Connections
    UI_Auth --> AuthGuard
    UI_Search --> RoomRoutes
    UI_Bookings --> BookingRoutes
    UI_Admin --> AdminRoutes

    RoomRoutes --> AuthGuard
    BookingRoutes --> AuthGuard
    AdminRoutes --> AuthGuard

    BookingRoutes --> IntervalEngine
    BookingRoutes --> ApprovalEngine
    BookingRoutes --> LockManager
    AdminRoutes --> ApprovalEngine

    IntervalEngine --> Prisma
    ApprovalEngine --> Prisma
    LockManager --> Prisma
    RoomRoutes --> Prisma

    Prisma --> Postgres
```

## Діаграма послідовності: створення бронювання (Sequence Diagram)

Required by lab Section 5. Covers the v1.0 booking creation path, including the concurrency conflict branch governed by ADR-001.

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
    Svc->>DB: BEGIN; SELECT room FOR UPDATE
    Svc->>DB: find overlapping ACTIVE bookings in [start, end)
    alt No overlap
        Svc->>DB: INSERT booking (status=ACTIVE); COMMIT
        Svc-->>API: booking
        API-->>UI: 201 Created
    else Overlap exists
        Svc->>DB: ROLLBACK
        Svc-->>API: ConflictError
        API-->>UI: 409 Conflict
    end
```
