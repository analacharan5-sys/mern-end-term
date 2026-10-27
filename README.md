# QueueLess 🎓⏱️

**QueueLess** is a complete, full-stack appointment booking and queue management application engineered for campus services. It eliminates long lines, prevents overbooking, provides students with real-time wait estimates, and empowers campus staff with operational control and utilization analytics.

---

## 🛠️ Mandatory Stack

- **Frontend**: React 18, Vite, Vanilla CSS Design System, Lucide Icons
- **Backend**: Node.js (v24), Express 4
- **Database**: MongoDB 7.0, Mongoose 8
- **Authentication**: JWT stored in `HttpOnly`, `SameSite=Lax` cookies
- **Security**: Double-Submit Cookie CSRF protection, `express-rate-limit`, `bcryptjs` password hashing, input interval validation, server-side role-based access control (RBAC).

---

## 🚀 Key Features & Core Workflows

### 1. Authentication & Roles
- **Self-Service Registration & Login**: Students and administrators can register with email, name, student ID, and department.
- **Secure Token Delivery**: JWT delivered via `HttpOnly` cookie to prevent client-side script theft (XSS).
- **Role Enforcement**: Administrative endpoints strictly protected on the backend (403 Forbidden for students; 401 for unauthenticated requests).
- **Ownership Protection**: Students can only view, check in, or cancel appointments they own.

### 2. Service & Slot Discovery
- **Campus Department Directory**: Active campus services (Academic Advising, Financial Aid, Health Center, Registrar, Career Services) displaying duration, capacity rules, and locations.
- **Date & Capacity Filtering**: Browse slots with live capacity meters (e.g. `2 / 3 spots reserved`, `1 open`, or `FULL`).
- **Interval Validation**: Strictly rejects invalid intervals ($startTime \ge endTime$, invalid 24-hr formats, past slots).
- **Graceful Inactivity Handling**: Returns structured error messages for inactive or closed departments.

### 3. Appointment Booking & Concurrency Protection
- **Atomic Capacity Increment**: Concurrency-safe atomic reservations using MongoDB `$inc` with `$expr: { $lt: ['$bookedCount', '$capacity'] }`.
- **Zero Overbooking**: Verified under parallel concurrency test load (excess concurrent booking requests receive `409 Conflict`).
- **Duplicate Prevention**: Rejects duplicate active bookings for the same user on the same slot or overlapping windows.
- **Compensating Rollback Pattern**: Atomically restores slot capacity if subsequent document creation encounters an unexpected failure.
- **Booking Confirmation**: Real-time confirmation modal with assigned queue ticket, visit summary, and navigation to live tracking.

### 4. Real-Time Queue Management
- **Deterministic Queue Ordering**: Sequential ticket numbers (`#1`, `#2`, `#3`...) assigned at reservation time.
- **Dynamic Position in Line**: Real-time calculation of active ahead count and estimated wait time based on department duration.
- **Allowed State Transitions**:
  - `booked` $\rightarrow$ `checked_in` (Student arrives)
  - `checked_in` $\rightarrow$ `completed` (Staff finishes consultation)
  - `booked` $\rightarrow$ `cancelled` (Student or staff cancels)
  - `checked_in` $\rightarrow$ `cancelled` (Student leaves or staff cancels)
  - Modifications to finalized states (`completed` or `cancelled`) are rejected with `400 Bad Request`.
- **Automatic Queue Recalculation**: When an earlier appointment cancels, following tickets automatically advance in line with zero manual intervention.

### 5. Administration & Reporting Desk
- **Campus Service CRUD**: Admins can add new departments, adjust slot durations and default capacities, toggle active status, or delete services safely.
- **Slot Generator**: Bulk generation tool to create consecutive working day slots between start and end hours in seconds.
- **Staff Operations Desk**: Real-time view of all appointments by department, date, and status with single-click check-in, completion, notes entry, and cancellation.
- **Analytics & Capacity Utilization**: Computes real-time metrics directly from persisted database records:
  - Total Slots, Total Capacity, Total Booked Seats
  - Capacity Utilization Rate: $(\text{Active/Served Seats} / \text{Total Capacity}) \times 100\%$
  - Completion Rate & Cancellation Rate
  - Per-service performance breakdown table with date range filtering.

---

## 💻 Quick Start & Setup Instructions

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd endterm-pro

# Install dependencies for both backend and frontend
npm install --prefix backend
npm install --prefix frontend
```

### 2. Configure Environment Variables

```bash
# Backend environment configuration
cp .env.example backend/.env
```

Ensure your `.env` contains:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/queueless
JWT_SECRET=super_secret_key_minimum_32_characters_long_for_security
CLIENT_URL=http://localhost:5173
```

### 3. Run Automated Tests

QueueLess includes a self-contained, automated test suite that runs against an in-memory MongoDB 7.0 engine:

```bash
npm run test:backend
# or
npm test --prefix backend
```

**Verified Test Results**:
```
✔ Administrative Operations, Role Authorization & Analytics Reporting (3 tests)
✔ Authentication & Role Permissions (6 tests)
✔ Appointment Booking & Concurrency Handling (4 tests)
✔ Cancellation & Availability Capacity Updates (4 tests)
✔ Queue Management & State Transitions (3 tests)
✔ Service & Slot Discovery and Interval Validation (5 tests)

ℹ tests 25 | suites 6 | pass 25 | fail 0 | cancelled 0
```

### 4. Run in Development Mode

In two separate terminals:

**Terminal 1 (Backend API)**:
```bash
npm run dev:backend
# Runs on http://localhost:5000
```

**Terminal 2 (Frontend Client)**:
```bash
npm run dev:frontend
# Runs on http://localhost:5173
```

### 5. Build for Production

```bash
npm run build:frontend
# Compiles SPA into frontend/dist/
```

In production mode (`NODE_ENV=production`), starting the backend via `node backend/src/server.js` automatically serves the compiled frontend and API from port 5000.

---

## 🔑 Default Seed Accounts & Credentials

When the backend starts for the first time, it automatically provisions initial campus departments, slots, and seed accounts:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@campus.edu` | `AdminPass123!` | Full admin privileges (services, slots, desk bookings, analytics) |
| **Student** | `student@campus.edu` | `StudentPass123!` | Student role (`STU-2026-8891`, Computer Science) |

*Quick login buttons are also provided directly on the login page for one-click testing.*

---

## 📁 Repository Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                 # MongoDB connection & disconnect handlers
│   │   │   └── seed.js               # Auto-seeding of campus services & accounts
│   │   ├── controllers/
│   │   │   ├── adminController.js    # Desk management, status transitions, analytics
│   │   │   ├── appointmentController.js # Atomic booking, user appointments, check-in
│   │   │   ├── authController.js     # Register, login, logout, getMe, CSRF tokens
│   │   │   ├── queueController.js    # Service queue tracker & live position metrics
│   │   │   ├── serviceController.js  # Campus service directory CRUD
│   │   │   └── slotController.js     # Single slot & bulk generator
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT cookie extraction, verification, RBAC
│   │   │   ├── csrf.js               # Double-submit cookie anti-CSRF protection
│   │   │   ├── errorHandler.js       # Centralized error handler
│   │   │   └── rateLimiter.js        # IP rate limiting
│   │   ├── models/
│   │   │   ├── Appointment.js        # Appointment document schema & indexes
│   │   │   ├── AvailabilitySlot.js   # Slot capacity & sequence counter schema
│   │   │   ├── Service.js            # Campus service schema & rules
│   │   │   └── User.js               # User schema with bcrypt encryption
│   │   ├── routes/                   # Modular Express routers
│   │   ├── app.js                    # Express app configuration & middleware
│   │   └── server.js                 # Server bootstrap & listener
│   ├── tests/
│   │   ├── admin.test.js             # RBAC & analytics calculation tests
│   │   ├── auth.test.js              # Auth, cookies, passwords, CSRF tests
│   │   ├── booking.test.js           # Capacity, duplicate & concurrency tests
│   │   ├── cancellation.test.js      # Cancellation & capacity restoration tests
│   │   ├── queue.test.js             # Queue ordering & transition tests
│   │   ├── slots.test.js             # Slot interval validation tests
│   │   └── setup.js                  # MongoMemoryServer in-memory test runner
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js             # Fetch client with credentials & CSRF header
│   │   ├── components/
│   │   │   └── Navbar.jsx            # Responsive navigation & role indicators
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Global user session context
│   │   ├── pages/
│   │   │   ├── AdminBookingsPage.jsx # Service desk operations & status updates
│   │   │   ├── AdminServicesPage.jsx # Campus service configuration
│   │   │   ├── AdminSlotsPage.jsx    # Bulk slot generator & capacity editor
│   │   │   ├── AdminStatsPage.jsx    # Real-time analytics & utilization report
│   │   │   ├── AvailableSlotsPage.jsx# Slot discovery & capacity view
│   │   │   ├── BookingModal.jsx      # Reservation modal & confirmation dialog
│   │   │   ├── LoginPage.jsx         # Sign in with demo account quick-fill
│   │   │   ├── MyAppointmentsPage.jsx# Active appointments & history
│   │   │   ├── QueueStatusPage.jsx   # Live queue tracker with auto-refresh
│   │   │   └── RegisterPage.jsx      # Student / staff registration
│   │   ├── styles/
│   │   │   └── app.css               # Comprehensive clean responsive stylesheet
│   │   ├── App.jsx                   # Main layout & routing
│   │   └── main.jsx                  # React DOM root entry
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── ARCHITECTURE.md                   # Architectural diagrams, concurrency strategy, data flow
├── API_DOCUMENTATION.md              # Detailed REST API specification
├── DEPLOYMENT.md                     # Production deployment, NGINX, and MongoDB guidance
├── .env.example                      # Root environment variables template
├── .gitignore                        # Git ignore rules for node_modules, dist, .env
└── package.json                      # Workspace root scripts
```

---

## 🧪 Automated Test Verification

All 8 requested test suites are verified:

1. **Authentication & Role Permissions**: Registration, duplicate rejection, bcrypt hashing verification, HttpOnly JWT cookies, logout expiry, `/api/auth/me`, and CSRF protection.
2. **Invalid Booking Intervals**: Rejects $startTime \ge endTime$, invalid 24-hr formats, invalid dates, and non-admin creation.
3. **Capacity Limits**: Enforces max capacity limits and blocks overbooking with `409 Conflict`.
4. **Duplicate Booking Prevention**: Blocks duplicate active reservations for the same student on the same slot.
5. **Concurrent Reservation Handling**: Simulates parallel requests racing for limited slot capacity; verifies that exactly the capacity limit succeeds, excess receives 409, and tickets are strictly sequential.
6. **Cancellation & Availability Updates**: Restores slot capacity upon cancellation, permitting subsequent bookings, while prohibiting cancellation of others' appointments.
7. **Queue State Transitions**: Validates `booked` $\rightarrow$ `checked_in` $\rightarrow$ `completed`, rejects invalid transitions, and verifies automatic position recalculation upon cancellation.
8. **Unauthorized Administrative Operations**: Blocks student access to administrative endpoints (`/api/services`, `/api/slots/generate`, `/api/admin/stats`, etc.) with `403 Forbidden`.
