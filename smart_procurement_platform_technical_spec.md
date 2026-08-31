# Smart Procurement Platform — Complete Technical Specification

## 1. Project Overview

A farmer-centric procurement management platform designed to reduce waiting time and congestion at procurement centres.

### Core Problem

Farmers face:

- Long waiting times at procurement centres
- Lack of information about procurement schedules
- Uncertainty about queue position
- Uncertainty about procurement completion
- Uncertainty about payment status
- Uneven load across procurement centres

### Core Solution

The platform provides:

1. Farmer registration and authentication
2. Crop registration
3. Procurement-centre discovery
4. Smart centre and slot recommendation
5. Slot booking
6. Token generation
7. Real-time queue management
8. Predicted waiting time
9. Congestion prediction
10. Dynamic load balancing
11. No-show handling
12. Procurement workflow tracking
13. Quality and weighing records
14. Payment-status tracking
15. SMS/app notifications
16. Centre/operator dashboard
17. Government/admin dashboard
18. Analytics and audit logs

---

# 2. Technology Stack

## Frontend

- React
- Vite
- JavaScript
- Tailwind CSS
- React Router
- Axios
- TanStack Query
- Recharts
- Leaflet
- PWA support

## Backend

- Node.js
- Express.js
- JavaScript
- JWT authentication
- bcrypt/argon2 for password hashing
- Zod/Joi/express-validator for validation
- Socket.IO

## Database

- PostgreSQL
- Prisma ORM

## Real-Time / Performance

- Redis
- Socket.IO

## AI/ML

- Python
- FastAPI
- Pandas
- NumPy
- Scikit-learn
- XGBoost
- OR-Tools

## Notifications

- Firebase Cloud Messaging
- SMS provider

## Deployment

- Can initially run without Docker.
- Docker can be added later for reproducible deployment.

---

# 3. User Roles

## 3.1 Farmer

Can:

- Register/login
- Manage profile
- Add crops
- View procurement centres
- View centre capacity
- Get recommended centre/slot
- Book slot
- Cancel booking
- View token
- View queue position
- View estimated waiting time
- Receive notifications
- Track procurement
- Track payment

## 3.2 Centre Operator

Can:

- Login
- View assigned centre
- View today's bookings
- Verify farmers
- Mark arrival
- Call next token
- Start verification
- Enter quality information
- Enter weight
- Complete procurement
- Mark no-show
- View current queue

## 3.3 Centre Manager

Can:

- Manage centre capacity
- Manage slots
- View operators
- View centre statistics
- Monitor queue
- Handle operational exceptions

## 3.4 District Admin

Can:

- View district centres
- Monitor congestion
- View bookings
- View procurement statistics
- View payment statistics
- View centre performance

## 3.5 State Admin

Can:

- View all districts
- View all centres
- View state-level analytics
- View congestion
- View procurement volume
- View payment status
- View audit activity

---

# 4. Feature Development Order

Build features in this order.

## Phase 1 — Project Foundation

### 1. Repository

Recommended structure:

```text
smart-procurement/
├── frontend/
├── backend/
├── ml-service/
├── docs/
├── .gitignore
└── README.md
```

### 2. Environment setup

Frontend:

```text
VITE_API_URL
VITE_SOCKET_URL
```

Backend:

```text
PORT
DATABASE_URL
JWT_SECRET
REDIS_URL
ML_SERVICE_URL
FCM credentials
SMS credentials
```

Never commit secrets.

---

# 5. Database Design

Important design decision:

`users`, `farmers`, and `farms` are different concepts.

- `users` = authentication and role
- `farmers` = farmer-specific information
- `farms` = optional detailed land information

For the initial PS-focused MVP, a separate `farms` table is **not mandatory**. Add it only if farm-level land/crop information is required.

The recommended MVP schema is below.

---

## 5.1 users

Stores login identity for every system user.

| Attribute | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(100) | NOT NULL |
| phone | VARCHAR(20) | UNIQUE, NOT NULL |
| email | VARCHAR(150) | UNIQUE, NULLABLE |
| password_hash | TEXT | NOT NULL |
| role | ENUM | NOT NULL |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

Roles:

```text
FARMER
CENTRE_OPERATOR
CENTRE_MANAGER
DISTRICT_ADMIN
STATE_ADMIN
```

---

## 5.2 farmers

Stores farmer-specific data.

| Attribute | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK users.id, UNIQUE |
| farmer_code | VARCHAR(50) | UNIQUE, NOT NULL |
| village | VARCHAR(100) | NOT NULL |
| district | VARCHAR(100) | NOT NULL |
| state | VARCHAR(100) | NOT NULL |
| address | TEXT | NULLABLE |
| latitude | DECIMAL | NULLABLE |
| longitude | DECIMAL | NULLABLE |
| preferred_language | VARCHAR(20) | DEFAULT 'en' |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

---

## 5.3 procurement_centres

Stores procurement centre information.

| Attribute | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(150) | NOT NULL |
| centre_code | VARCHAR(50) | UNIQUE |
| address | TEXT | NOT NULL |
| village | VARCHAR(100) | NULLABLE |
| district | VARCHAR(100) | NOT NULL |
| state | VARCHAR(100) | NOT NULL |
| latitude | DECIMAL | NOT NULL |
| longitude | DECIMAL | NOT NULL |
| daily_capacity | INTEGER | NOT NULL |
| status | ENUM | NOT NULL |
| opening_time | TIME | NOT NULL |
| closing_time | TIME | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

Status:

```text
ACTIVE
INACTIVE
MAINTENANCE
OVERLOADED
```

---

## 5.4 centre_operators

Links users to procurement centres.

| Attribute | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK users.id |
| centre_id | UUID | FK procurement_centres.id |
| created_at | TIMESTAMP | NOT NULL |

---

## 5.5 crops

Stores farmer crop/produce information.

| Attribute | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| farmer_id | UUID | FK farmers.id |
| crop_type | VARCHAR(100) | NOT NULL |
| season | VARCHAR(50) | NOT NULL |
| quantity | DECIMAL(12,2) | NOT NULL |
| unit | VARCHAR(20) | DEFAULT 'quintal' |
| harvest_date | DATE | NULLABLE |
| status | ENUM | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

Possible status:

```text
AVAILABLE
BOOKED
PROCURED
CANCELLED
```

---

## 5.6 slots

Stores bookable time slots.

| Attribute | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| centre_id | UUID | FK procurement_centres.id |
| slot_date | DATE | NOT NULL |
| start_time | TIME | NOT NULL |
| end_time | TIME | NOT NULL |
| capacity | INTEGER | NOT NULL |
| booked_count | INTEGER | DEFAULT 0 |
| status | ENUM | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

Status:

```text
OPEN
FULL
CLOSED
CANCELLED
```

Important rule:

`booked_count` must never exceed `capacity`.

Use a PostgreSQL transaction/locking strategy to prevent concurrent overbooking.

---

## 5.7 bookings

Main booking table.

| Attribute | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| booking_number | VARCHAR(50) | UNIQUE |
| farmer_id | UUID | FK farmers.id |
| crop_id | UUID | FK crops.id |
| centre_id | UUID | FK procurement_centres.id |
| slot_id | UUID | FK slots.id |
| token_number | INTEGER | NOT NULL |
| status | ENUM | NOT NULL |
| booked_at | TIMESTAMP | NOT NULL |
| cancelled_at | TIMESTAMP | NULLABLE |
| cancellation_reason | TEXT | NULLABLE |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

Booking statuses:

```text
BOOKED
CONFIRMED
ARRIVED
IN_QUEUE
CALLED
VERIFICATION
QUALITY_CHECK
WEIGHING
APPROVED
PROCURED
PAYMENT_PROCESSING
PAID
CANCELLED
NO_SHOW
REJECTED
```

---

## 5.8 queue_entries

Stores live queue state.

| Attribute | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| booking_id | UUID | FK bookings.id, UNIQUE |
| centre_id | UUID | FK procurement_centres.id |
| token_number | INTEGER | NOT NULL |
| queue_position | INTEGER | NULLABLE |
| estimated_wait_minutes | INTEGER | NULLABLE |
| status | ENUM | NOT NULL |
| arrived_at | TIMESTAMP | NULLABLE |
| called_at | TIMESTAMP | NULLABLE |
| service_started_at | TIMESTAMP | NULLABLE |
| completed_at | TIMESTAMP | NULLABLE |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

Queue statuses:

```text
WAITING
CALLED
SERVING
COMPLETED
NO_SHOW
CANCELLED
```

---

## 5.9 quality_checks

Stores quality inspection data.

| Attribute | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| booking_id | UUID | FK bookings.id, UNIQUE |
| checked_by | UUID | FK users.id |
| quality_status | ENUM | NOT NULL |
| grade | VARCHAR(50) | NULLABLE |
| moisture_percentage | DECIMAL(5,2) | NULLABLE |
| remarks | TEXT | NULLABLE |
| checked_at | TIMESTAMP | NOT NULL |

Possible status:

```text
PENDING
PASSED
FAILED
CONDITIONAL
```

---

## 5.10 weighments

Stores actual measured quantity.

| Attribute | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| booking_id | UUID | FK bookings.id, UNIQUE |
| measured_by | UUID | FK users.id |
| expected_quantity | DECIMAL(12,2) | NOT NULL |
| actual_quantity | DECIMAL(12,2) | NOT NULL |
| unit | VARCHAR(20) | NOT NULL |
| remarks | TEXT | NULLABLE |
| measured_at | TIMESTAMP | NOT NULL |

---

## 5.11 procurements

Stores final procurement record.

| Attribute | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| booking_id | UUID | FK bookings.id, UNIQUE |
| operator_id | UUID | FK users.id |
| procurement_amount | DECIMAL(14,2) | NOT NULL |
| status | ENUM | NOT NULL |
| completed_at | TIMESTAMP | NULLABLE |
| remarks | TEXT | NULLABLE |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

Statuses:

```text
PENDING
APPROVED
COMPLETED
REJECTED
```

---

## 5.12 payments

Stores payment tracking.

| Attribute | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| procurement_id | UUID | FK procurements.id, UNIQUE |
| amount | DECIMAL(14,2) | NOT NULL |
| status | ENUM | NOT NULL |
| transaction_reference | VARCHAR(150) | NULLABLE |
| payment_method | VARCHAR(50) | NULLABLE |
| initiated_at | TIMESTAMP | NULLABLE |
| completed_at | TIMESTAMP | NULLABLE |
| failure_reason | TEXT | NULLABLE |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

Statuses:

```text
PENDING
PROCESSING
PAID
FAILED
CANCELLED
```

---

## 5.13 notifications

| Attribute | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK users.id |
| type | ENUM | NOT NULL |
| title | VARCHAR(150) | NOT NULL |
| message | TEXT | NOT NULL |
| channel | ENUM | NOT NULL |
| status | ENUM | NOT NULL |
| sent_at | TIMESTAMP | NULLABLE |
| created_at | TIMESTAMP | NOT NULL |

Channels:

```text
PUSH
SMS
IN_APP
```

Statuses:

```text
PENDING
SENT
FAILED
READ
```

---

## 5.14 notification_devices

Stores farmer/operator device tokens.

| Attribute | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK users.id |
| device_token | TEXT | UNIQUE |
| platform | VARCHAR(20) | NULLABLE |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

---

## 5.15 audit_logs

Tracks sensitive actions.

| Attribute | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK users.id |
| action | VARCHAR(100) | NOT NULL |
| entity_type | VARCHAR(100) | NOT NULL |
| entity_id | UUID | NULLABLE |
| old_value | JSONB | NULLABLE |
| new_value | JSONB | NULLABLE |
| ip_address | INET | NULLABLE |
| created_at | TIMESTAMP | NOT NULL |

---

# 6. Optional farms table

Only add this if the project later needs farm-level land information.

```text
farms
├── id
├── farmer_id
├── farm_name
├── land_area
├── area_unit
├── village
├── latitude
├── longitude
├── created_at
└── updated_at
```

It is NOT required for the core PS.

---

# 7. API Design

Base URL:

```text
/api/v1
```

Standard response format:

### Success

```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "message": "Slot is already full",
  "code": "SLOT_FULL",
  "errors": []
}
```

---

# 8. HTTP Status Code Rules

Use:

```text
200 OK
```

Successful GET/update operations.

```text
201 Created
```

Successful resource creation.

```text
204 No Content
```

Successful deletion when no response body is required.

```text
400 Bad Request
```

Malformed request or invalid business input.

```text
401 Unauthorized
```

Missing/invalid/expired authentication.

```text
403 Forbidden
```

Authenticated user lacks permission.

```text
404 Not Found
```

Requested resource does not exist.

```text
409 Conflict
```

Duplicate resource, booking conflict, full slot, invalid state transition.

```text
422 Unprocessable Entity
```

Validation failure when using semantic validation responses.

```text
429 Too Many Requests
```

Rate limit exceeded.

```text
500 Internal Server Error
```

Unexpected server error.

```text
502 Bad Gateway
```

Backend cannot communicate with a dependent service such as ML/SMS.

```text
503 Service Unavailable
```

Temporary service/database dependency unavailable.

---

# 9. Authentication APIs

## POST /api/v1/auth/register

Register a farmer.

Request:

```json
{
  "name": "Prem Singh",
  "phone": "9876543210",
  "email": "prem@example.com",
  "password": "StrongPassword",
  "village": "Village X",
  "district": "Ludhiana",
  "state": "Punjab",
  "preferred_language": "en"
}
```

Success:

```text
201 Created
```

Errors:

```text
400 BAD_REQUEST
409 PHONE_ALREADY_REGISTERED
409 EMAIL_ALREADY_REGISTERED
422 VALIDATION_ERROR
500 INTERNAL_SERVER_ERROR
```

---

## POST /api/v1/auth/login

Request:

```json
{
  "phone": "9876543210",
  "password": "StrongPassword"
}
```

Success:

```text
200 OK
```

Errors:

```text
400 BAD_REQUEST
401 INVALID_CREDENTIALS
403 ACCOUNT_DISABLED
429 TOO_MANY_REQUESTS
500 INTERNAL_SERVER_ERROR
```

---

## POST /api/v1/auth/logout

Authentication required.

Success:

```text
204 No Content
```

Errors:

```text
401 UNAUTHORIZED
500 INTERNAL_SERVER_ERROR
```

---

## GET /api/v1/auth/me

Returns current user.

Success:

```text
200 OK
```

Errors:

```text
401 UNAUTHORIZED
404 USER_NOT_FOUND
500 INTERNAL_SERVER_ERROR
```

---

# 10. Farmer APIs

## GET /api/v1/farmers/me

Get farmer profile.

Success:

```text
200
```

Errors:

```text
401
403
404
500
```

## PATCH /api/v1/farmers/me

Update farmer profile.

Possible fields:

```text
name
email
village
district
state
address
latitude
longitude
preferred_language
```

Errors:

```text
400
401
409
422
500
```

---

# 11. Crop APIs

## POST /api/v1/crops

Create crop record.

Success:

```text
201 Created
```

Errors:

```text
400
401
422
500
```

## GET /api/v1/crops

List farmer's crops.

Success:

```text
200
```

Errors:

```text
401
500
```

## GET /api/v1/crops/:id

Get crop.

Errors:

```text
401
403
404
500
```

## PATCH /api/v1/crops/:id

Update crop.

Errors:

```text
400
401
403
404
409
422
500
```

## DELETE /api/v1/crops/:id

Delete/cancel crop record when allowed.

Errors:

```text
401
403
404
409
500
```

---

# 12. Procurement Centre APIs

## GET /api/v1/centres

List centres.

Query parameters:

```text
district
state
status
latitude
longitude
radius
crop_type
date
```

Success:

```text
200
```

Errors:

```text
400
422
500
```

## GET /api/v1/centres/:id

Get centre details.

Success:

```text
200
```

Errors:

```text
404
500
```

## GET /api/v1/centres/:id/availability

Returns:

```text
available slots
capacity
current queue
estimated waiting time
```

Errors:

```text
400
404
500
503
```

---

# 13. Slot APIs

## GET /api/v1/centres/:centreId/slots

Query:

```text
date
```

Success:

```text
200
```

Errors:

```text
400
404
422
500
```

## POST /api/v1/centres/:centreId/slots

Manager/admin only.

Request:

```json
{
  "slot_date": "2026-09-01",
  "start_time": "09:00",
  "end_time": "10:00",
  "capacity": 30
}
```

Errors:

```text
400
401
403
404
409
422
500
```

## PATCH /api/v1/slots/:id

Manager/admin only.

Errors:

```text
400
401
403
404
409
422
500
```

## DELETE /api/v1/slots/:id

Manager/admin only.

Errors:

```text
401
403
404
409
500
```

---

# 14. Smart Recommendation APIs

## GET /api/v1/recommendations/centres

Input:

```text
crop_id
quantity
latitude
longitude
date
preferred_time
```

Returns ranked centres:

```json
{
  "recommendations": [
    {
      "centre_id": "uuid",
      "score": 91,
      "distance_km": 8.2,
      "estimated_wait_minutes": 24,
      "congestion_level": "LOW"
    }
  ]
}
```

Errors:

```text
400
401
404
422
502
503
500
```

## GET /api/v1/recommendations/slots

Returns recommended centre + slot.

Errors:

```text
400
401
404
409
422
502
503
500
```

---

# 15. Booking APIs

## POST /api/v1/bookings

Creates booking.

Request:

```json
{
  "crop_id": "uuid",
  "centre_id": "uuid",
  "slot_id": "uuid"
}
```

Backend must verify:

1. Farmer exists
2. Crop belongs to farmer
3. Centre exists
4. Slot exists
5. Slot is open
6. Slot has capacity
7. Crop is available
8. Farmer does not have conflicting active booking

The entire reservation must happen inside a PostgreSQL transaction.

Success:

```text
201 Created
```

Errors:

```text
400 INVALID_BOOKING_REQUEST
401 UNAUTHORIZED
404 CROP_NOT_FOUND
404 CENTRE_NOT_FOUND
404 SLOT_NOT_FOUND
409 SLOT_FULL
409 BOOKING_CONFLICT
409 CROP_ALREADY_BOOKED
409 SLOT_CLOSED
422 VALIDATION_ERROR
500 INTERNAL_SERVER_ERROR
```

## GET /api/v1/bookings

List current farmer bookings.

Query:

```text
status
from
to
page
limit
```

Errors:

```text
401
422
500
```

## GET /api/v1/bookings/:id

Get booking details.

Errors:

```text
401
403
404
500
```

## POST /api/v1/bookings/:id/cancel

Cancel booking.

Errors:

```text
400
401
403
404
409 BOOKING_ALREADY_CANCELLED
409 BOOKING_CANNOT_BE_CANCELLED
500
```

---

# 16. Queue APIs

## GET /api/v1/bookings/:id/queue

Returns:

```text
token number
queue position
people ahead
estimated waiting time
current serving token
```

Errors:

```text
401
403
404
500
```

## POST /api/v1/bookings/:id/arrival

Operator or controlled farmer check-in.

Success:

```text
200
```

Errors:

```text
401
403
404
409 ALREADY_ARRIVED
409 INVALID_BOOKING_STATUS
500
```

## POST /api/v1/queue/:centreId/call-next

Operator only.

Success:

```text
200
```

Errors:

```text
401
403
404
409 QUEUE_EMPTY
409 CURRENT_TOKEN_ACTIVE
500
```

## POST /api/v1/queue/:bookingId/no-show

Operator only.

Errors:

```text
401
403
404
409 INVALID_QUEUE_STATE
500
```

---

# 17. Procurement APIs

## POST /api/v1/procurements/:bookingId/start

Operator only.

Errors:

```text
401
403
404
409 INVALID_BOOKING_STATUS
500
```

## POST /api/v1/procurements/:bookingId/quality

Request:

```json
{
  "quality_status": "PASSED",
  "grade": "A",
  "moisture_percentage": 12.4,
  "remarks": "Accepted"
}
```

Errors:

```text
400
401
403
404
409 QUALITY_ALREADY_SUBMITTED
422
500
```

## POST /api/v1/procurements/:bookingId/weighment

Request:

```json
{
  "actual_quantity": 41.6,
  "unit": "quintal"
}
```

Errors:

```text
400
401
403
404
409 WEIGHMENT_ALREADY_SUBMITTED
422
500
```

## POST /api/v1/procurements/:bookingId/complete

Completes procurement.

Errors:

```text
401
403
404
409 QUALITY_NOT_COMPLETED
409 WEIGHMENT_NOT_COMPLETED
409 INVALID_PROCUREMENT_STATE
500
```

## GET /api/v1/procurements/:bookingId

Returns complete procurement status.

Errors:

```text
401
403
404
500
```

---

# 18. Payment APIs

## GET /api/v1/payments/:bookingId

Returns payment status.

Success:

```text
200
```

Errors:

```text
401
403
404
500
```

## POST /api/v1/payments/:procurementId/initiate

Admin/payment-service controlled endpoint.

Errors:

```text
401
403
404
409 PAYMENT_ALREADY_INITIATED
409 PROCUREMENT_NOT_COMPLETED
502 PAYMENT_PROVIDER_ERROR
503 PAYMENT_SERVICE_UNAVAILABLE
500
```

## POST /api/v1/payments/:id/webhook

Payment provider callback.

Must validate webhook signature.

Errors:

```text
400 INVALID_WEBHOOK
401 INVALID_SIGNATURE
404 PAYMENT_NOT_FOUND
409 DUPLICATE_WEBHOOK
500
```

---

# 19. Notification APIs

## POST /api/v1/devices

Register FCM device token.

Errors:

```text
400
401
409 DEVICE_ALREADY_REGISTERED
422
500
```

## GET /api/v1/notifications

List notifications.

Query:

```text
page
limit
unread
```

Errors:

```text
401
500
```

## PATCH /api/v1/notifications/:id/read

Marks notification read.

Errors:

```text
401
403
404
500
```

---

# 20. Admin/Centre APIs

## GET /api/v1/centre/dashboard

Returns:

```text
today's bookings
current token
queue size
completed procurements
average waiting time
capacity utilization
```

Errors:

```text
401
403
404
500
```

## GET /api/v1/admin/dashboard

Returns:

```text
total farmers
total bookings
active centres
current queue
average wait
procurement volume
payment status
congestion
```

Errors:

```text
401
403
500
```

## GET /api/v1/admin/centres/:id/analytics

Returns:

```text
daily bookings
average wait
processing time
no-show rate
utilization
procurement volume
```

Errors:

```text
401
403
404
422
500
```

---

# 21. ML Service APIs

ML service runs separately using FastAPI.

Base URL internally:

```text
http://ml-service:8000
```

## POST /predict/wait-time

Input:

```json
{
  "centre_id": "uuid",
  "queue_size": 42,
  "staff_count": 6,
  "machines_available": 3,
  "crop_type": "wheat",
  "quantity": 35,
  "hour": 14,
  "day_of_week": 2
}
```

Output:

```json
{
  "predicted_wait_minutes": 78,
  "confidence": 0.86
}
```

Errors:

```text
400
422
500
```

## POST /predict/congestion

Returns predicted utilization/congestion for future intervals.

Errors:

```text
400
422
500
```

## POST /optimize/allocation

Uses OR-Tools.

Input:

```text
farmer demand
centre capacity
slots
queue
distance
processing time
```

Output:

```text
recommended centre
recommended slot
optimization score
```

Errors:

```text
400
422
500
503
```

---

# 22. Real-Time Socket.IO Events

Use Socket.IO for live queue updates.

## Farmer joins centre room

```text
centre:join
```

## Queue update

```text
queue:updated
```

Payload:

```json
{
  "centre_id": "uuid",
  "current_token": 183,
  "queue_length": 24,
  "updated_at": "..."
}
```

## Token called

```text
queue:token-called
```

## Farmer's booking updated

```text
booking:updated
```

## Procurement status updated

```text
procurement:updated
```

## Payment status updated

```text
payment:updated
```

Important:

PostgreSQL remains the source of truth. Socket.IO only distributes updates.

---

# 23. Redis Usage

Redis should NOT replace PostgreSQL.

Use Redis for:

- Queue cache
- Short-lived booking locks
- Rate limiting
- Pub/Sub
- Frequently accessed centre availability
- Temporary session/state data where appropriate

Conceptually:

```text
PostgreSQL = permanent truth
Redis = fast temporary/cache layer
```

---

# 24. Core Intelligent Features

## 24.1 Smart Centre Recommendation

Inputs:

- Farmer location
- Current queue
- Centre capacity
- Current utilization
- Predicted waiting time
- Distance
- Available slots
- Crop quantity

Output:

```text
Best centre
Expected wait
Distance
Recommended slot
Reason
```

Example:

```text
Centre A
8 km
110 min wait

Centre B
14 km
24 min wait

Recommendation:
Centre B

Reason:
~86 minutes lower predicted waiting time.
```

---

# 25. Predictive Waiting Time

Do not rely on ML initially.

First implement:

```text
queue size × average processing time
```

Then replace/enhance it with XGBoost.

Potential features:

```text
queue_size
staff_count
machine_count
crop_type
quantity
hour
day_of_week
historical_processing_time
centre_id
current_utilization
```

Target:

```text
waiting_time_minutes
```

---

# 26. Congestion Prediction

Predict:

```text
30 minutes
60 minutes
90 minutes
```

Example:

```text
Current utilization: 72%

30 min: 78%
60 min: 89%
90 min: 97%
```

If predicted congestion crosses a threshold:

```text
Trigger alert
```

---

# 27. Dynamic Load Balancing

If:

```text
Centre A = 95% utilization
Centre B = 40% utilization
```

system can recommend shifting future bookings.

Do not automatically move an already-arrived farmer without explicit operational rules.

For the prototype, dynamically optimize:

- Upcoming bookings
- Waitlisted farmers
- New booking requests

---

# 28. Personalized Arrival Window

Instead of:

```text
Come at 2 PM
```

provide:

```text
Recommended arrival:
2:20 PM – 2:35 PM
```

based on:

- Token
- Queue movement
- Estimated service time
- Current centre capacity

Goal:

```text
Reduce physical waiting at centre
```

---

# 29. No-Show Recovery

Workflow:

```text
Booking
 ↓
Farmer doesn't arrive
 ↓
Mark NO_SHOW
 ↓
Free capacity
 ↓
Offer/recommend slot to waitlisted/new farmers
```

The system should prevent a no-show from permanently wasting a slot.

---

# 30. Capacity Shock Handling

Example:

```text
Normal machines = 4
Available machines = 2
```

System recalculates:

```text
Processing capacity
Expected wait
Congestion
Recommended slots
```

Then displays:

```text
Centre capacity reduced.

Upcoming demand should be redirected
to nearby available centres.
```

---

# 31. Nearest vs Fastest Centre

Don't simply recommend the closest centre.

Compare:

```text
distance
vs
predicted waiting time
```

Example:

```text
Nearest:
8 km
120 min wait

Fastest:
15 km
25 min wait
```

Show both and explain the trade-off.

---

# 32. Centre Health Score

Calculate an operational score from:

- Capacity utilization
- Queue growth
- Average processing time
- No-show rate
- Payment delays
- Equipment availability

Example:

```text
Centre Health: 82/100

Utilization: 82%
Queue growth: +14%
Average processing: 4.2 min
No-show: 8%
```

---

# 33. Anomaly Detection — Optional

Detect unusual operational patterns:

- Repeated weight modifications
- Unusual processing times
- Abnormally high rejection/approval rates
- Repeated manual changes

Label this:

```text
Operational Anomaly / Risk Flag
```

Do not claim automatic fraud detection unless you have strong evidence and rules.

---

# 34. Farmer Interface

Main screens:

```text
Login
Register
Dashboard
Profile
My Crops
Add Crop
Find Centres
Centre Details
Smart Recommendation
Book Slot
Booking Confirmation
My Bookings
Token / Queue
Procurement Status
Payment Status
Notifications
```

---

# 35. Centre Operator Interface

Screens:

```text
Login
Centre Dashboard
Today's Bookings
Live Queue
Farmer Verification
Token Management
Quality Check
Weighment
Procurement Completion
Payment Status
Centre Analytics
```

---

# 36. Government Dashboard

Main dashboard:

```text
Total Farmers
Bookings Today
Active Centres
Current Queue
Average Wait
Procurement Volume
Payments Pending
Centre Utilization
```

Centre map:

```text
GREEN = normal
YELLOW = high utilization
RED = overloaded
```

AI section:

```text
Predicted congestion
Recommended load redistribution
Expected waiting time
```

---

# 37. Notification Rules

Send notifications for:

### Booking

```text
Booking confirmed
Booking cancelled
Slot reminder
```

### Queue

```text
Queue approaching
Token called
Arrival reminder
```

### Procurement

```text
Quality completed
Weighment completed
Procurement completed
```

### Payment

```text
Payment initiated
Payment processing
Payment completed
Payment failed
```

---

# 38. Security

Implement:

- JWT authentication
- Password hashing
- Role-based access control
- Input validation
- Rate limiting
- Helmet
- CORS
- Secure environment variables
- PostgreSQL parameterized/ORM queries
- Audit logs
- Webhook signature verification
- HTTPS in production

Never trust:

```text
role
farmer_id
centre_id
payment status
```

from the frontend without server-side verification.

---

# 39. Important Business Rules

## Booking

- Cannot book a closed slot.
- Cannot exceed slot capacity.
- Farmer cannot book the same crop multiple times unless explicitly allowed.
- Cancellation allowed only before defined cutoff.
- Booking must generate unique booking number.
- Token must be unique within centre/date.

## Queue

- Only one active token per centre.
- A token can only move through valid states.
- No-show cannot be called again unless explicitly reactivated.
- Queue position should be calculated server-side.

## Procurement

Required sequence:

```text
BOOKED
→ ARRIVED
→ VERIFICATION
→ QUALITY_CHECK
→ WEIGHING
→ APPROVED
→ PROCURED
→ PAYMENT_PROCESSING
→ PAID
```

Do not allow arbitrary status jumps.

---

# 40. Recommended Frontend Routes

```text
/
 /login
 /register

 /farmer
 /farmer/profile
 /farmer/crops
 /farmer/crops/new
 /farmer/centres
 /farmer/centres/:id
 /farmer/recommendation
 /farmer/bookings
 /farmer/bookings/:id
 /farmer/queue/:id
 /farmer/procurement/:id
 /farmer/payment/:id
 /farmer/notifications

 /centre
 /centre/bookings
 /centre/queue
 /centre/farmer/:id
 /centre/procurement/:id
 /centre/analytics

 /admin
 /admin/centres
 /admin/centres/:id
 /admin/analytics
 /admin/congestion
 /admin/audit
```

---

# 41. Development Order

## Stage 1 — Foundation

Build:

```text
React
Express
PostgreSQL
Prisma
```

Then:

```text
User
Farmer
Centre
Crop
```

---

## Stage 2 — Authentication

Build:

```text
Register
Login
JWT
RBAC
Profile
```

---

## Stage 3 — Centre and Slot Management

Build:

```text
Centre creation
Centre details
Slot creation
Slot availability
Capacity
```

---

## Stage 4 — Booking

Build:

```text
Crop selection
Centre selection
Slot selection
Booking
Token generation
Cancellation
```

Make concurrency-safe booking before moving forward.

---

## Stage 5 — Procurement Workflow

Build:

```text
Arrival
Verification
Quality
Weighment
Procurement
Payment status
```

---

## Stage 6 — Centre Dashboard

Build:

```text
Today's bookings
Current token
Queue
Call next
No-show
Procurement processing
```

---

## Stage 7 — Real-Time

Add:

```text
Socket.IO
```

Then:

```text
Live queue
Token updates
Booking updates
Procurement updates
```

---

## Stage 8 — Redis

Add:

```text
Caching
Queue state
Locks
Rate limiting
Pub/Sub
```

Only after the basic system works.

---

## Stage 9 — ML Data

Create realistic historical/synthetic records containing:

```text
centre
queue
staff
machines
crop
quantity
time
processing time
waiting time
utilization
```

---

## Stage 10 — ML

Build:

```text
Waiting-time prediction
Congestion prediction
```

Start with simple baseline calculations, then XGBoost.

---

## Stage 11 — Optimization

Use OR-Tools for:

```text
Centre allocation
Slot allocation
Load balancing
```

---

## Stage 12 — Notifications

Add:

```text
FCM
SMS
In-app notifications
```

---

## Stage 13 — Maps

Add:

```text
Leaflet
OpenStreetMap
```

Show:

```text
Nearby centres
Distance
Congestion
Recommended centre
```

---

## Stage 14 — Analytics

Build:

```text
Centre performance
Queue statistics
Procurement volume
Payment statistics
Congestion analytics
```

---

## Stage 15 — Security + Testing

Test:

```text
Authentication
Authorization
Concurrent booking
Queue transitions
Procurement states
Payment states
ML failures
Notification failures
```

---

## Stage 16 — Deployment

Initial deployment can be done without Docker.

Suggested production structure:

```text
React
   ↓
Backend
   ├── PostgreSQL
   ├── Redis
   └── ML Service
```

Add Docker later if deployment/team environment requires it.

---

# 42. MVP vs Advanced Features

## Must Have

```text
Authentication
Farmer profile
Crop registration
Centre listing
Slot booking
Token generation
Queue management
Procurement tracking
Payment tracking
Centre dashboard
Notifications
```

## Strong Differentiators

```text
Real-time queue
Waiting-time prediction
Congestion prediction
Smart centre recommendation
Smart slot recommendation
```

## Advanced

```text
Dynamic load balancing
Personalized arrival window
No-show recovery
Capacity shock handling
Centre health score
Maps
```

## Optional

```text
IVR
Offline-first PWA
Anomaly detection
Detailed farms module
```

---

# 43. Most Important Product Principle

The project should NOT be presented as:

```text
"An app for booking procurement slots."
```

That is too basic.

Present it as:

```text
"An intelligent procurement-centre management and
load-balancing platform that predicts waiting time,
anticipates congestion, and optimizes farmer allocation
across centres."
```

The basic booking system is the foundation.

The main innovation is:

```text
Current Data
     +
Historical Data
     ↓
Prediction
     ↓
Waiting Time / Congestion
     ↓
Optimization
     ↓
Centre + Slot Recommendation
     ↓
Real-Time Queue
     ↓
Dynamic Reallocation
     ↓
Reduced Waiting + Reduced Congestion
```

---

# 44. Final Target Architecture

```text
                         FARMER
                           │
                           ▼
                    React + Vite
                           │
                    REST / Socket.IO
                           │
                           ▼
                  Node.js + Express
                    /      |       \
                   /       |        \
                  ▼        ▼         ▼
            PostgreSQL   Redis     FastAPI
               │                    │
               │                    ▼
               │              Python ML
               │              XGBoost
               │              OR-Tools
               │
               ▼
       Procurement Data
               │
       ┌───────┼────────┐
       ▼       ▼        ▼
    Booking   Queue   Procurement
                         │
                         ▼
                      Payment

          Notifications:
          FCM + SMS

          Maps:
          Leaflet + OpenStreetMap

          Dashboards:
          Farmer
          Centre
          Government
```

# 45. Recommended First Milestone

Do NOT start with AI.

Your first working milestone should be:

```text
Farmer registers
       ↓
Farmer logs in
       ↓
Adds crop
       ↓
Views procurement centres
       ↓
Views available slots
       ↓
Books slot
       ↓
Gets token
       ↓
Centre operator sees booking
       ↓
Operator marks arrival
       ↓
Farmer sees queue
```

Once this entire flow works reliably, add real-time updates.

Then add ML and optimization.

This order minimizes risk and ensures that even if an advanced feature is incomplete, you still have a complete working core system for the SIH demonstration.
