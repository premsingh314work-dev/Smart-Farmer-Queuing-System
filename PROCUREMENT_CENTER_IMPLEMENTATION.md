# Procurement Center Implementation - Backend Complete ✅

## Overview

Implemented complete backend support for **Procurement Centers** with full workflows for:

- Centre management
- Slot booking
- Queue management
- Procurement operations
- Quality checks & weighment

---

## 1. Database Schema Updates

### Added Models to Prisma:

#### **CentreOperator**

- Links users to procurement centres
- One operator can work at one centre
- Used to assign staff to centres

#### **Slot**

- Bookable time slots at each centre
- Tracks capacity and booked count
- Prevents overbooking with database constraints

#### **Booking**

- Main booking record linking farmer, crop, centre, slot
- Tracks booking status through procurement workflow
- Supports cancellations with reason tracking

#### **QueueEntry**

- Live queue state for each booking
- Tracks queue position, estimated wait time
- Updates as farmers are called/served

#### **QualityCheck**

- Stores quality inspection results
- Grade, moisture %, remarks
- Checked by operator at centre

#### **Weighment**

- Stores actual measured quantity
- Compares expected vs actual
- Records operator and timestamp

#### **Procurement**

- Final procurement record
- Stores amount and approval status
- Links to payment processing

---

## 2. API Routes Implemented

### **A. Centres Routes** (`/api/v1/centres`)

#### Public/Farmer Endpoints:

```
GET  /api/v1/centres
- List all centres with filters
- Query: district, state, status, latitude, longitude, radius
- Returns: List of centres with available slots

GET  /api/v1/centres/:id
- Get centre details
- Returns: Centre info + operators + future slots

GET  /api/v1/centres/:id/availability
- Get real-time centre status
- Returns: Available slots, queue length, estimated wait time
```

#### Manager/Admin Endpoints:

```
POST   /api/v1/centres
- Create new centre (CENTRE_MANAGER, DISTRICT_ADMIN, STATE_ADMIN only)
- Required: name, centreCode, address, district, state, latitude, longitude, dailyCapacity

PATCH  /api/v1/centres/:id
- Update centre details
- Can update: name, address, village, capacity, status, hours
```

---

### **B. Slots Routes** (`/api/v1/centres/:centreId/slots`)

#### Public/Farmer Endpoints:

```
GET  /api/v1/centres/:centreId/slots
- Get available slots for a centre
- Query: date (YYYY-MM-DD)
- Returns: List of slots with capacity info
```

#### Manager/Admin Endpoints:

```
POST   /api/v1/centres/:centreId/slots
- Create new slot
- Required: slot_date, start_time, end_time, capacity
- Prevents duplicate slots for same time

PATCH  /api/v1/slots/:slotId
- Update slot (capacity, status)
- Validates capacity >= booked count

DELETE /api/v1/slots/:slotId
- Delete slot (only if no bookings exist)
```

---

### **C. Bookings Routes** (`/api/v1/bookings`)

#### Farmer Endpoints:

```
POST   /api/v1/bookings
- Create new booking
- Required: crop_id, centre_id, slot_id
- Validates:
  ✅ Crop exists & belongs to farmer
  ✅ Crop is AVAILABLE
  ✅ Centre & slot exist
  ✅ Slot has capacity
  ✅ No conflicting bookings
- Automatically generates token number
- Creates queue entry
- Updates crop status to BOOKED

GET    /api/v1/bookings
- List farmer's bookings
- Query: status, page, limit
- Returns: Paginated bookings with details

GET    /api/v1/bookings/:id
- Get booking details
- Includes: crop, centre, slot, queue, quality, weighment, procurement

POST   /api/v1/bookings/:id/cancel
- Cancel booking (only BOOKED or CONFIRMED status)
- Updates: Booking status, slot count, crop status
- Deletes: Queue entry
```

---

### **D. Procurement Routes** (`/api/v1/procurements`)

#### Operator Endpoints:

```
POST   /api/v1/procurements/:bookingId/start
- Start procurement process
- Updates booking status: VERIFICATION
- Updates queue: SERVING
- Required: Operator assigned to booking's centre

POST   /api/v1/procurements/:bookingId/quality
- Submit quality check
- Required: quality_status (PASSED/FAILED/CONDITIONAL)
- Optional: grade, moisture_percentage, remarks
- Updates booking status: QUALITY_CHECK
- One check per booking

POST   /api/v1/procurements/:bookingId/weighment
- Submit weighment data
- Required: actual_quantity, unit
- Compares vs expected quantity
- Updates booking status: WEIGHING
- One weighment per booking

POST   /api/v1/procurements/:bookingId/complete
- Complete procurement
- Required: procurement_amount
- Validates: Quality check + Weighment completed
- Creates procurement record
- Updates booking: PROCURED
- Updates crop: PROCURED
- Updates queue: COMPLETED

GET    /api/v1/procurements/:bookingId
- Get full procurement status
- Returns: Booking + quality + weighment + procurement details
```

---

### **E. Queue Routes** (`/api/v1/queue`)

#### Farmer Endpoints:

```
GET    /api/v1/queue/booking/:bookingId
- Get queue position & info
- Returns:
  - Token number
  - Queue position
  - People ahead
  - Estimated wait time
  - Currently serving token

POST   /api/v1/queue/:bookingId/arrival
- Mark farmer as arrived
- Updates booking: ARRIVED
- Updates queue: arrivedAt timestamp
- Farmer can now be called
```

#### Operator Endpoints:

```
POST   /api/v1/queue/:centreId/call-next
- Call next farmer in queue
- Gets first WAITING farmer who has ARRIVED
- Updates queue: CALLED
- Updates booking: IN_QUEUE
- Validates: No current serving token
- Required: Operator at this centre

POST   /api/v1/queue/:bookingId/no-show
- Mark farmer as no-show
- Updates booking & queue: NO_SHOW
- Resets crop to AVAILABLE
- Required: Booking in CALLED/IN_QUEUE status

GET    /api/v1/queue/centre/:centreId/queue
- Get current queue at centre
- Returns: All WAITING/CALLED/SERVING entries
- Ordered by queue position
- Includes farmer + crop details
- Required: Operator at this centre
```

---

## 3. Booking Workflow

### Step-by-Step Flow:

```
1. FARMER SIDE:
   ├─ Browse centres (GET /api/v1/centres)
   ├─ Check availability (GET /api/v1/centres/:id/availability)
   ├─ View slots (GET /api/v1/centres/:id/slots)
   ├─ Create booking (POST /api/v1/bookings)
   │  └─ Crop: AVAILABLE → BOOKED
   │  └─ Booking: BOOKED
   │  └─ Queue: WAITING (auto-created)
   ├─ Check queue position (GET /api/v1/queue/booking/:bookingId)
   └─ Mark arrival (POST /api/v1/queue/:bookingId/arrival)
      └─ Booking: ARRIVED

2. OPERATOR SIDE:
   ├─ View queue (GET /api/v1/queue/centre/:centreId/queue)
   ├─ Call next token (POST /api/v1/queue/:centreId/call-next)
   │  └─ Queue: CALLED
   │  └─ Booking: IN_QUEUE
   ├─ Start procurement (POST /api/v1/procurements/:bookingId/start)
   │  └─ Booking: VERIFICATION
   │  └─ Queue: SERVING
   ├─ Quality check (POST /api/v1/procurements/:bookingId/quality)
   │  └─ Booking: QUALITY_CHECK
   ├─ Weighment (POST /api/v1/procurements/:bookingId/weighment)
   │  └─ Booking: WEIGHING
   └─ Complete (POST /api/v1/procurements/:bookingId/complete)
      └─ Booking: PROCURED
      └─ Crop: PROCURED
      └─ Queue: COMPLETED
      └─ Procurement: APPROVED
```

---

## 4. Role-Based Access Control

### Roles Implemented:

| Role                | Permissions                                                                 |
| ------------------- | --------------------------------------------------------------------------- |
| **FARMER**          | View centres, book slots, cancel bookings, check queue, mark arrival        |
| **CENTRE_OPERATOR** | Call next token, quality check, weighment, complete procurement, view queue |
| **CENTRE_MANAGER**  | Create/update centres, create/update slots, manage operators                |
| **DISTRICT_ADMIN**  | All centre manager permissions for district                                 |
| **STATE_ADMIN**     | All centre manager permissions for state                                    |

---

## 5. Key Features & Validations

### Booking Validations:

✅ Crop must be AVAILABLE  
✅ Crop must belong to farmer  
✅ Slot must be OPEN  
✅ Slot must have capacity  
✅ No duplicate booking for same slot  
✅ No conflicting bookings for same crop  
✅ Atomic transaction (prevents race conditions)

### Procurement Validations:

✅ Operator must be assigned to centre  
✅ Quality check must be submitted before completion  
✅ Weighment must be submitted before completion  
✅ Only one quality check & weighment per booking

### Queue Management:

✅ Queue position calculated based on arrivals  
✅ Estimated wait time tracked  
✅ Current serving token displayed  
✅ No-show handling (resets crop availability)

---

## 6. Status Transitions

### Booking Status Flow:

```
BOOKED → CONFIRMED → ARRIVED → IN_QUEUE → CALLED →
VERIFICATION → QUALITY_CHECK → WEIGHING → APPROVED → PROCURED
                                                     ↓
                                            PAYMENT_PROCESSING → PAID

Alternative endings:
├─ CANCELLED (farmer cancels)
├─ NO_SHOW (farmer doesn't arrive)
└─ REJECTED (quality fails)
```

### Crop Status:

```
AVAILABLE → BOOKED → PROCURED
                  ↓
                CANCELLED (if booking cancelled)
```

### Queue Status:

```
WAITING → CALLED → SERVING → COMPLETED
                          ↓
                       NO_SHOW
```

---

## 7. Database Constraints

✅ Unique booking per farmer-slot combination  
✅ Booked count never exceeds slot capacity  
✅ Atomic transactions prevent race conditions  
✅ Foreign key cascades for data integrity  
✅ Timestamps for all operations

---

## 8. Error Handling

Standard error codes implemented:

```
400 - VALIDATION_ERROR (missing/invalid fields)
401 - UNAUTHORIZED (not authenticated)
403 - FORBIDDEN (no permission/not assigned to centre)
404 - NOT_FOUND (resource doesn't exist)
409 - CONFLICT (booking conflict, slot full, duplicate, state invalid)
422 - UNPROCESSABLE (semantic validation failure)
500 - INTERNAL_SERVER_ERROR (server error)
```

---

## 9. Testing Checklist

**Booking Flow:**

- [ ] Create booking with valid data
- [ ] Reject booking if slot full
- [ ] Reject booking if crop already booked
- [ ] Cancel booking and verify cleanup
- [ ] Test queue entry creation

**Procurement Flow:**

- [ ] Start procurement
- [ ] Submit quality check
- [ ] Submit weighment
- [ ] Complete procurement
- [ ] Verify all statuses updated

**Queue Management:**

- [ ] Mark arrival
- [ ] Call next token
- [ ] Verify queue position
- [ ] Mark no-show

**Validations:**

- [ ] Operator authorization (must be at centre)
- [ ] Farmer authorization (can only see own bookings)
- [ ] Role-based access control

---

## 10. Next Steps (Frontend/ML Service)

1. **Frontend:**
   - Centre discovery & map view
   - Slot selection UI
   - Booking confirmation page
   - Real-time queue tracking
   - Operator dashboard for queue management
   - Quality/weighment forms

2. **ML Service:**
   - Congestion prediction
   - Smart centre recommendations
   - Estimated wait time calculation
   - Load balancing algorithm

3. **Notifications:**
   - Booking confirmation SMS/push
   - Queue position updates
   - Token called notification
   - Procurement completed notification

4. **Admin Dashboard:**
   - Centre analytics
   - Queue analytics
   - Operator performance
   - Payment tracking

---

**Status:** ✅ **COMPLETE**

All backend routes for procurement centers have been implemented according to the technical specification!
