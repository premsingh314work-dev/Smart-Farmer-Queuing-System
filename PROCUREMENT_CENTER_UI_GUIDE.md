# Procurement Center UI Implementation Guide

## Overview

Complete frontend UI implementation for the Smart Farmer Procurement System with 5 new pages supporting the entire procurement workflow from crop booking to payment.

---

## 📋 Pages Created

### 1. **CentreFinder** (`/centres`)

**Purpose**: Browse and discover procurement centres

**Features**:

- 🔍 Search centres by name or village
- 🗺️ Filter by state and district
- 📊 View centre details (location, capacity, hours, status)
- 🎯 List and map view toggle (map view placeholder for future development)
- ✨ Responsive grid layout with 3 columns on desktop

**Key Components**:

- Search bar with multiple filters
- Centre cards with:
  - Centre name and code
  - Location information
  - Operating hours
  - Daily capacity
  - Status indicator
  - "View Details & Book" button
- Results counter
- Empty state messaging

**Navigation**:

- Dashboard → "Find Centres" button
- Navigates to CentreDetails on centre selection

**API Endpoints Used**:

```
GET /api/v1/centres - List all centres with optional filters
- Query params: state, district
```

---

### 2. **CentreDetails** (`/centre/:centreId`)

**Purpose**: View centre details and book slots

**Features**:

- 📍 Full centre information (address, hours, capacity)
- 🌾 Crop selection from farmer's available crops
- 📅 Date picker with validation (no past dates)
- ⏰ Available time slots with capacity display
- 📊 Booking summary sidebar
- 🎯 Real-time availability updates

**Key Components**:

- Centre header with full details
- Two-column layout:
  - Left: Crop selector + Date picker + Slot selector
  - Right: Booking summary (sticky)
- Crop cards showing:
  - Crop type
  - Quantity and unit
  - Season
  - Harvest date
- Slot cards showing:
  - Time range
  - Capacity and booked count
  - Available spaces
  - Full/available status
- "Confirm Booking" button with validation

**Validation**:

- Must select both crop and slot
- Can only book available crops
- Cannot book full slots
- Date must be today or later

**Navigation**:

- Back to CentreFinder
- Navigates to BookingConfirmation on successful booking

**API Endpoints Used**:

```
GET /api/v1/centres/:id - Centre details
GET /api/v1/centres/:id/slots - Slots for specific date
GET /api/v1/crops - Available crops
POST /api/v1/bookings - Create booking
```

---

### 3. **BookingConfirmation** (`/booking-confirmation`)

**Purpose**: Confirm and display booking details

**Features**:

- ✅ Large success indicator
- 🎫 Booking number display (large, monospace font)
- 🏷️ Token number highlighted
- 📋 Complete booking details:
  - Centre name and location
  - Crop type and quantity
  - Slot time and date
  - Harvest date
  - Booking status
- 📌 Step-by-step next steps guide
- 🖨️ Print functionality
- 🔄 Navigation to queue tracker

**Key Components**:

- Success header with checkmark
- Booking summary cards:
  - Booking number (green highlight)
  - Token number (blue highlight)
  - Status (purple highlight)
- Details grid (2 columns)
- Yellow-highlighted "What's Next?" section with 5 steps
- Action buttons:
  - Track Queue Position
  - Print Confirmation
  - Back to Dashboard

**Navigation**:

- Navigates to QueueTracker
- Or back to Dashboard
- Or back to CentreFinder

**API Endpoints Used**:

```
GET /api/v1/bookings/:id - Fetch full booking details
```

---

### 4. **QueueTracker** (`/queue-tracker`)

**Purpose**: Real-time queue position and wait time tracking

**Features**:

- 📊 Real-time queue metrics:
  - Token number (large display)
  - Queue position
  - People ahead count
  - Estimated wait time in minutes
- 🔄 Auto-refresh every 5 seconds
- 📋 Current booking status
- 🌾 Crop information display
- 🏢 Centre information
- 📈 Visual workflow timeline with status indicators
- ✓ Arrival tracking with button

**Key Components**:

- 4-column metric cards (responsive grid)
- Status section showing:
  - Booking number and status
  - Crop type and quantity
  - Centre details
- Timeline showing:
  - Booking Confirmed ✓
  - Farmer Arrival (interactive)
  - Quality Check
  - Weighment & Payment
- Auto-check-in button (when status is BOOKED)
- Arrival confirmed message (when ARRIVED)

**Real-time Updates**:

- Fetches data every 5 seconds
- Displays "⟳ Updating..." indicator
- Automatically updates on:
  - Position changes
  - Wait time changes
  - Status changes
  - Queue progression

**Navigation**:

- Back to Dashboard

**API Endpoints Used**:

```
GET /api/v1/queue/booking/:bookingId - Queue position info
POST /api/v1/queue/:bookingId/arrival - Mark farmer arrival
GET /api/v1/bookings/:id - Booking details
```

---

### 5. **OperatorDashboard** (`/operator-dashboard`)

**Purpose**: Queue management and procurement operations for operators

**Features**:

#### Queue Management Tab:

- 📋 Live queue list with:
  - Token number
  - Farmer name
  - Crop details
  - Current status
- 📢 "Call Next" button to summon next farmer
- 👤 Selected booking summary (sticky)
- ❌ "Mark No-Show" button

#### Processing Tab:

- ✅ Quality Check form:
  - Status dropdown (PASSED/FAILED/CONDITIONAL)
  - Grade selector (A-D)
  - Moisture percentage input
  - Remarks textarea
  - Submit button
- ⚖️ Weighment form:
  - Expected quantity display
  - Actual quantity input
  - Remarks textarea
  - Submit button
- 💰 Procurement completion form:
  - Amount input
  - Final remarks
  - Complete button

**Key Components**:

- Tab navigation (Queue Management / Processing)
- Queue list (left) + Summary (right) layout
- Forms with proper validation
- Real-time queue updates

**Features**:

- Auto-refresh queue every 5 seconds
- Tab switching between management and processing
- Form state management
- Error handling and user feedback
- Booking summary sidebar (sticky)

**Navigation**:

- Tab switching
- Back to Dashboard

**API Endpoints Used**:

```
GET /api/v1/queue/centre/:centreId/queue - Queue list
POST /api/v1/queue/:centreId/call-next - Call next farmer
POST /api/v1/queue/:bookingId/no-show - Mark no-show
POST /api/v1/procurements/:bookingId/quality - Submit quality check
POST /api/v1/procurements/:bookingId/weighment - Submit weighment
POST /api/v1/procurements/:bookingId/complete - Complete procurement
```

---

## 🎨 Design System

### Colors:

- **Green**: Primary (success, actions) - `#16a34a`
- **Blue**: Secondary (info, alternative actions) - `#2563eb`
- **Red**: Danger (delete, cancel, no-show) - `#dc2626`
- **Orange**: Warning (in-progress, waiting) - `#ea580c`
- **Gray**: Neutral (disabled, secondary text) - `#6b7280`

### Typography:

- **Headers**: Bold, large text for section titles
- **Labels**: Small, uppercase, bold for form labels
- **Body**: Regular text for descriptions
- **Monospace**: For booking numbers and IDs

### Spacing:

- **Container**: `max-w-6xl` with `mx-auto`
- **Padding**: `p-4` to `p-8` for sections
- **Gap**: `gap-4` to `gap-8` for grids

### Responsive Design:

- **Mobile-first**: Single column on small screens
- **Tablet**: 2-3 columns at `md:` breakpoint
- **Desktop**: 3-4 columns at `lg:` breakpoint
- **Sticky**: Sidebars stick to viewport on scroll

---

## 🔄 User Flows

### Farmer Flow:

```
Dashboard
  ↓
Find Centres (CentreFinder)
  ↓
Select Centre → View Details (CentreDetails)
  ↓
Select Crop → Select Slot → Confirm Booking
  ↓
Booking Confirmation (BookingConfirmation)
  ↓
Track Queue (QueueTracker)
  ↓
Mark Arrival → Wait for Token Call
  ↓
Quality Check & Weighment (by Operator)
  ↓
Receive Payment
```

### Operator Flow:

```
Operator Dashboard (OperatorDashboard)
  ↓
Queue Management Tab
  ↓
Call Next Farmer → Farmer appears in queue
  ↓
Select Booking → Processing Tab
  ↓
Submit Quality Check → Submit Weighment
  ↓
Complete Procurement & Amount
  ↓
Booking finalized, queue updates
```

---

## 🛠️ Component Integration

### Shared Components Used:

- `LoadingSpinner` - Loading states
- `ErrorMessage` - Error displays
- `ProtectedRoute` - Authentication

### Auth Integration:

- All pages protected with `<ProtectedRoute>`
- Token from `localStorage.getItem("token")`
- User info from `useAuth()` context

### API Integration:

- Axios with authorization header
- Error handling and user feedback
- Loading states for all async operations

---

## 📱 Responsive Breakpoints

All pages are fully responsive:

- **Mobile** (< 768px): Single column, full width
- **Tablet** (768px-1024px): 2 columns, adjusted spacing
- **Desktop** (> 1024px): 3-4 columns, optimal layout

---

## 🎯 Key Features

✅ **Real-time Updates**: Queue tracker and operator dashboard refresh every 5 seconds
✅ **Form Validation**: All forms validate before submission
✅ **Error Handling**: User-friendly error messages
✅ **Accessibility**: Semantic HTML, proper labels
✅ **Responsive**: Works on all screen sizes
✅ **User Feedback**: Loading states, success messages, error alerts
✅ **State Management**: React hooks for local state
✅ **Navigation**: Smooth routing between pages

---

## 🚀 To Add These Pages to Your App

1. **Import in App.jsx**:

```javascript
import {
  CentreFinder,
  CentreDetails,
  BookingConfirmation,
  QueueTracker,
  OperatorDashboard,
} from "./pages";
```

2. **Add Routes**:

```javascript
<Route path="/centres" element={<ProtectedRoute><CentreFinder /></ProtectedRoute>} />
<Route path="/centre/:centreId" element={<ProtectedRoute><CentreDetails /></ProtectedRoute>} />
<Route path="/booking-confirmation" element={<ProtectedRoute><BookingConfirmation /></ProtectedRoute>} />
<Route path="/queue-tracker" element={<ProtectedRoute><QueueTracker /></ProtectedRoute>} />
<Route path="/operator-dashboard" element={<ProtectedRoute><OperatorDashboard /></ProtectedRoute>} />
```

3. **Update Dashboard Quick Actions**:

```javascript
{ label: "Find Centres", path: "/centres" },
{ label: "Queue Tracker", path: "/queue-tracker" },
{ label: "Operator Dashboard", path: "/operator-dashboard" },
```

4. **Install Dependencies** (if needed):

```bash
pnpm install axios react-router-dom
```

---

## 📝 Notes

- All forms include proper error handling and validation
- Dates are validated to prevent past dates and future bookings
- Queue tracker auto-refreshes for real-time updates
- Operator dashboard supports multiple simultaneous bookings
- All pages are fully mobile-responsive
- Status indicators use color coding for clarity
- Booking numbers and tokens are highlighted for easy reference

---

**Total UI Pages**: 5  
**Total Routes**: 5  
**Components Updated**: 3 (App.jsx, Dashboard.jsx, pages/index.js)  
**API Integrations**: 15+ endpoints  
**Responsive Breakpoints**: 3 (mobile, tablet, desktop)
