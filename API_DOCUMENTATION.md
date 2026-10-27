# QueueLess REST API Documentation

Base URL: `http://localhost:5000/api`

All mutating endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) require credentials (`credentials: 'include'`) and matching `x-csrf-token` headers when cookie authentication is active.

---

## 1. Authentication Endpoints

### 1.1 Register User
- **Method**: `POST`
- **Path**: `/api/auth/register`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "name": "Alex Morgan",
    "email": "alex.morgan@campus.edu",
    "password": "Password123!",
    "role": "student", // "student" or "admin"
    "studentId": "STU-2026-8891",
    "department": "Computer Science"
  }
  ```
- **Responses**:
  - `201 Created`: Returns user object and sets `jwt` (HttpOnly) & `XSRF-TOKEN` cookies.
  - `400 Bad Request`: Validation error or duplicate email.

### 1.2 User Login
- **Method**: `POST`
- **Path**: `/api/auth/login`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "email": "alex.morgan@campus.edu",
    "password": "Password123!"
  }
  ```
- **Responses**:
  - `200 OK`: Sets `jwt` HttpOnly cookie.
  - `401 Unauthorized`: Invalid credentials.

### 1.3 User Logout
- **Method**: `POST`
- **Path**: `/api/auth/logout`
- **Auth**: Public / Authenticated
- **Responses**:
  - `200 OK`: Clears `jwt` cookie.

### 1.4 Get Current Session User
- **Method**: `GET`
- **Path**: `/api/auth/me`
- **Auth**: Authenticated (Student or Admin)
- **Responses**:
  - `200 OK`: Returns authenticated user profile.
  - `401 Unauthorized`: Missing or invalid session.

### 1.5 Get CSRF Token
- **Method**: `GET`
- **Path**: `/api/auth/csrf-token`
- **Responses**:
  - `200 OK`: `{ "success": true, "csrfToken": "<token_string>" }`

---

## 2. Campus Services Endpoints

### 2.1 Get Active Services
- **Method**: `GET`
- **Path**: `/api/services`
- **Query Params**:
  - `category` (optional): Filter by category.
  - `search` (optional): Filter by name or description.
  - `includeInactive` (optional, boolean): Available to admins to view deactivated services.
- **Responses**:
  - `200 OK`: `{ "success": true, "count": 5, "services": [...] }`

### 2.2 Get Service Details
- **Method**: `GET`
- **Path**: `/api/services/:id`
- **Responses**:
  - `200 OK`: `{ "success": true, "service": { ... } }`
  - `404 Not Found`: Service does not exist or is inactive.

### 2.3 Create Service (Admin Only)
- **Method**: `POST`
- **Path**: `/api/services`
- **Auth**: Admin
- **Request Body**:
  ```json
  {
    "name": "Financial Aid & Grants",
    "description": "Consultation on student aid and scholarships",
    "category": "Financial Aid",
    "durationMinutes": 20,
    "defaultCapacity": 3,
    "bufferMinutes": 5,
    "location": "Union Building Room 102",
    "contactEmail": "aid@campus.edu",
    "isActive": true
  }
  ```
- **Responses**:
  - `201 Created`: Returns created service.
  - `403 Forbidden`: Caller is not an administrator.

### 2.4 Update Service (Admin Only)
- **Method**: `PUT`
- **Path**: `/api/services/:id`
- **Auth**: Admin

### 2.5 Delete Service (Admin Only)
- **Method**: `DELETE`
- **Path**: `/api/services/:id`
- **Auth**: Admin
- **Behavior**: If active appointments exist, automatically sets `isActive: false` to preserve referential history.

---

## 3. Availability Slots Endpoints

### 3.1 Get Slots for Service & Date
- **Method**: `GET`
- **Path**: `/api/slots`
- **Query Params**:
  - `serviceId` (required): ObjectId of the service.
  - `date` (optional): `YYYY-MM-DD`. Defaults to current date onwards.
  - `onlyAvailable` (optional): `true` to filter out full slots.
- **Responses**:
  - `200 OK`: Returns slots array with `capacity`, `bookedCount`, `availableSeats`, `isFull`.
  - `400 Bad Request`: Inactive service or invalid date format.

### 3.2 Create Single Slot (Admin Only)
- **Method**: `POST`
- **Path**: `/api/slots`
- **Auth**: Admin
- **Request Body**:
  ```json
  {
    "serviceId": "654e...",
    "date": "2026-11-15",
    "startTime": "09:00",
    "endTime": "09:30",
    "capacity": 3
  }
  ```
- **Validation**: Enforces `startTime < endTime` (rejects start $\ge$ end with 400).

### 3.3 Bulk Generate Slots (Admin Only)
- **Method**: `POST`
- **Path**: `/api/slots/generate`
- **Auth**: Admin
- **Request Body**:
  ```json
  {
    "serviceId": "654e...",
    "date": "2026-11-15",
    "dayStartTime": "09:00",
    "dayEndTime": "17:00",
    "slotDurationMinutes": 30,
    "capacity": 3
  }
  ```

---

## 4. Appointment Booking & Management Endpoints

### 4.1 Book an Appointment Slot
- **Method**: `POST`
- **Path**: `/api/appointments`
- **Auth**: Authenticated Student or Admin
- **Rate Limit**: 60 requests / 15 minutes
- **Request Body**:
  ```json
  {
    "slotId": "654e...",
    "reason": "Graduation degree check"
  }
  ```
- **Concurrency & Validation Rules**:
  - Atomic capacity increment: `bookedCount < capacity`.
  - Duplicate prevention: rejects if user already has active appointment for this slot.
  - Assigns unique, sequential `queueNumber`.
- **Responses**:
  - `201 Created`: `{ "success": true, "appointment": { ... }, "queue": { "positionInLine": 1, ... } }`
  - `409 Conflict`: Slot full, or duplicate active booking exists.

### 4.2 Get My Appointments
- **Method**: `GET`
- **Path**: `/api/appointments/my`
- **Auth**: Authenticated User
- **Responses**:
  - `200 OK`: List of all user's appointments with attached dynamic queue positions.

### 4.3 Check In to Appointment
- **Method**: `PATCH`
- **Path**: `/api/appointments/:id/check-in`
- **Auth**: Appointment Owner or Admin
- **Validation**:
  - Allowed from status: `booked`
  - Sets `status: 'checked_in'` and `checkedInAt = Date.now()`
- **Responses**:
  - `200 OK`: Updated appointment with live queue confirmation.
  - `400 Bad Request`: If already checked in, completed, or cancelled.

### 4.4 Cancel Appointment
- **Method**: `PATCH`
- **Path**: `/api/appointments/:id/cancel`
- **Auth**: Appointment Owner or Admin
- **Request Body**: `{ "reason": "Student schedule conflict" }`
- **Validation & Side Effects**:
  - Allowed from status: `booked` or `checked_in`.
  - Atomically decrements slot `bookedCount` (`$inc: -1`), restoring capacity.
  - Marks `status: 'cancelled'` and `cancelledAt: Date.now()`.
- **Responses**:
  - `200 OK`: Capacity restored.
  - `403 Forbidden`: User attempts to cancel another student's appointment.
  - `400 Bad Request`: Appointment is already completed or cancelled.

---

## 5. Live Queue Endpoints

### 5.1 Get Service Department Queue
- **Method**: `GET`
- **Path**: `/api/queue/service/:serviceId`
- **Query Params**: `date=YYYY-MM-DD`
- **Privacy & Masking**:
  - Student viewers see masked names (e.g., `Alex M.`) to preserve student privacy.
  - Admin viewers see full student name, email, and studentId.
- **Responses**:
  - `200 OK`: Currently serving ticket, waiting count, completed count, queue tickets list.

### 5.2 Get Live Queue Status for Specific Appointment
- **Method**: `GET`
- **Path**: `/api/queue/appointment/:id`
- **Auth**: Appointment Owner or Admin
- **Responses**:
  - `200 OK`: Position in line, ahead count, estimated wait time in minutes.

---

## 6. Administrative & Reporting Endpoints

### 6.1 View All Appointments (Admin Desk)
- **Method**: `GET`
- **Path**: `/api/admin/appointments`
- **Auth**: Admin
- **Query Params**: `serviceId`, `status`, `date`, `page`, `limit`.

### 6.2 Update Appointment Status (Admin Desk)
- **Method**: `PATCH`
- **Path**: `/api/admin/appointments/:id/status`
- **Auth**: Admin
- **Request Body**:
  ```json
  {
    "status": "completed", // "checked_in", "completed", "cancelled"
    "notes": "Reviewed graduation portfolio, approved credit waiver."
  }
  ```

### 6.3 Dashboard Analytics & Utilization
- **Method**: `GET`
- **Path**: `/api/admin/stats`
- **Auth**: Admin
- **Query Params**: `startDate`, `endDate`, `serviceId`
- **Metrics Calculated From Persisted Records**:
  - `totalServices`, `activeServices`
  - `totalSlots`, `totalCapacity`, `totalBookedSeats`
  - `totalAppointments`, `statusCounts` (`booked`, `checked_in`, `completed`, `cancelled`)
  - `utilizationRate` (%): $$\frac{\text{completed} + \text{checked\_in} + \text{booked}}{\text{totalCapacity}} \times 100$$
  - `completionRate` (%): $$\frac{\text{completed}}{\text{totalAppointments}} \times 100$$
  - `cancellationRate` (%): $$\frac{\text{cancelled}}{\text{totalAppointments}} \times 100$$
  - Per-service breakdown array.
