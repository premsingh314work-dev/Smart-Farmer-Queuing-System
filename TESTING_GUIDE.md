# 🚀 TESTING GUIDE - How to See the UI in Action

## 📋 Quick Checklist

- [ ] Backend installed (`npm install` done - we saw `Exit Code: 0`)
- [ ] Frontend installed with Leaflet (`npm install leaflet leaflet-react` done)
- [ ] Database configured
- [ ] Seeds will add 6 centres and 126 slots
- [ ] Both servers will run simultaneously
- [ ] UI pages will be accessible

---

## ⚡ 5-MINUTE SETUP

### Step 1: Add Sample Data (60 seconds)
```bash
cd backend
node seed-centres.js
```

**Expected Output:**
```
🌱 Starting seed data for Procurement Centres...

✅ Created: Amritsar Procurement Centre (AMR-001)
✅ Created: Ludhiana Central Procurement Centre (LUD-001)
✅ Created: Jalandhar Grain Centre (JAL-001)
✅ Created: Patiala Regional Centre (PAT-001)
✅ Created: Bathinda Market Centre (BAT-001)
✅ Created: Mohali Tech Procurement (MOH-001)

✅ Created 21 slots for Amritsar Procurement Centre
✅ Created 21 slots for Ludhiana Central Procurement Centre
✅ Created 21 slots for Jalandhar Grain Centre
✅ Created 21 slots for Patiala Regional Centre
✅ Created 21 slots for Bathinda Market Centre
✅ Created 21 slots for Mohali Tech Procurement

✨ Seed data created successfully!

📊 Summary:
   - Centres created: 6
   - Slots created: 126

🎯 Test the system by:
   1. Login as a farmer
   2. Go to 'Find Procurement Centre'
   3. Or login as centre manager to 'Centre Manager Dashboard'
```

### Step 2: Start Backend (New Terminal)
```bash
cd backend
npm run dev
```

**Expected Output:**
```
Database connected successfully
Smart Farmer API listening on http://localhost:3000
```

### Step 3: Start Frontend (New Terminal)
```bash
cd frontend
npm run dev
```

**Expected Output:**
```
VITE v5.0.8  ready in 123 ms

➜  Local:   http://localhost:5173/
```

### Step 4: Open Browser
Go to: **http://localhost:5173**

---

## 🎯 WHAT TO DO AFTER SETUP

### SCENARIO 1: Test Farmer Features

**Goal:** Find the best procurement centre

1. **Login/Register as Farmer**
   - Go to login page
   - Create account or login

2. **Navigate to "Find Centre"**
   - Look for "Find Procurement Centre" or similar
   - Or go to: `http://localhost:5173/find-centre`

3. **You Should See:**
   ```
   ┌─────────────────────────────────────┐
   │ Find Procurement Centres            │
   │                                     │
   │ [State: ____]                       │
   │ [District: ____]                    │
   │ [Radius: 50km v] [Search]           │
   │                    [💡 Recommend]   │
   │                                     │
   │ Card 1: Amritsar Centre             │
   │ - Distance: 12.5 km                 │
   │ - Queue: 15                         │
   │ - Congestion: MEDIUM 🟡             │
   │ - Wait: 225 min                     │
   │ - Score: 91/100 ███████████░        │
   │                                     │
   │ Card 2: Ludhiana Centre             │
   │ - Distance: 8.2 km                  │
   │ - Queue: 20                         │
   │ - Congestion: HIGH 🔴               │
   │ - Wait: 300 min                     │
   │ - Score: 78/100 ████████░           │
   │                                     │
   └─────────────────────────────────────┘
   ```

4. **Try These Actions:**
   - ✅ Change "Radius" to 25km → See fewer centres
   - ✅ Click "💡 Get Smart Recommendations" → See AI-ranked centres
   - ✅ Click "📍 Show Map View" → See Leaflet map with pins
   - ✅ Click "View Details & Book" → Go to centre page
   - ✅ Notice congestion colors change (GREEN/YELLOW/RED)

---

### SCENARIO 2: Test Manager Features

**Goal:** Manage slots at a centre

1. **Login as Centre Manager**
   - Role must be: `CENTRE_MANAGER`
   - Or ask admin to set your role

2. **Navigate to "Centre Manager Dashboard"**
   - Go to: `http://localhost:5173/centre-manager/{centreId}`
   - Use one of the centre IDs from seed data

3. **You Should See Overview Tab:**
   ```
   ┌──────────────────────────────────┐
   │ Amritsar Procurement Centre      │
   │ 123 Golden Temple Road           │
   │ AMR-001                          │
   │                                  │
   │ [Overview][Slots][Bookings][Stats]
   │                                  │
   │ ┌─────────────┐  ┌────────────┐  │
   │ │ Status: 🟢   │  │ Total: 125 │  │
   │ │ Active       │  │ Confirmed: 95
   │ │             │  │ Procured: 87  │
   │ │ Capacity: 100│  │ Utils: 87%  │  │
   │ │ Hours: 9-5   │  └────────────┘  │
   │ │ Coords...    │                  │
   │ └─────────────┘                  │
   └──────────────────────────────────┘
   ```

4. **Click "Slot Management" Tab:**
   ```
   ┌──────────────────────────────────┐
   │ [+ Create New Slot]              │
   │                                  │
   │ Date       | Time       | Cap    │
   │─────────────────────────────────  │
   │ 2026-09-01 | 09:00-11:00 | 30   │
   │ 2026-09-01 | 12:00-14:00 | 25   │
   │ 2026-09-01 | 15:00-17:00 | 20   │
   │ 2026-09-02 | 09:00-11:00 | 30   │
   │            |             |      │
   │            | [Edit] [Delete]    │
   └──────────────────────────────────┘
   ```

5. **Try These Actions:**
   - ✅ Click "+ Create New Slot" → Fill form, submit
   - ✅ Click "Edit" → Modify capacity
   - ✅ Click "Delete" → Remove slot (if no bookings)
   - ✅ See modal popup for forms
   - ✅ Click "Bookings" tab → See all farmer bookings
   - ✅ Click "Statistics" tab → See utilization %

---

## 🔍 DETAILED FEATURES TO VERIFY

### Feature 1: Distance Filtering
**Test this:**
- Location: Amritsar (31.6340, 74.8711)
- Radius 25km → Should show ~2-3 centres
- Radius 50km → Should show all 6 centres
- Radius 100km → Should show all 6 centres

**Why it works:**
- Script added 6 centres across Punjab
- Each centre has real GPS coordinates
- Backend calculates Haversine distance

---

### Feature 2: Smart Recommendations
**Test this:**
- Click "💡 Get Smart Recommendations"
- See centres ranked 0-100
- First one should have highest score

**Scoring breakdown for top centre:**
```
Distance: 40 points (closer is better)
Capacity: 30 points (more slots available)
Congestion: 30 points (lower queue is better)
TOTAL: 90-100 (top recommendation)
```

---

### Feature 3: Real-time Queue Data
**What you'll see:**
- Queue Length: Current number of farmers waiting
- Congestion Level: LOW (green), MEDIUM (yellow), HIGH (red)
- Wait Time: Estimated minutes (queue_size × 15)
- Available Capacity: How many slots still open

**Color Coding:**
- 🟢 GREEN (LOW): < 50% capacity filled
- 🟡 YELLOW (MEDIUM): 50-80% capacity filled
- 🔴 RED (HIGH): > 80% capacity filled

---

### Feature 4: Map View (Leaflet)
**Test this:**
- Click "📍 Show Map View" button
- Should see OpenStreetMap with pins
- Pins at each centre location
- Click pin → See centre name

**Requirements:**
- Leaflet installed ✅ (we did this)
- Internet connection (for map tiles)

---

### Feature 5: Slot Management
**Create a slot:**
1. Click "+ Create New Slot"
2. Date: 2026-09-05 (future date)
3. Start: 11:00
4. End: 12:00
5. Capacity: 25
6. Submit

**Edit a slot:**
1. Click "Edit" on any slot
2. Change capacity to 40
3. Click "Update"

**Delete a slot:**
1. Click "Delete" on any slot
2. Confirm deletion
3. Slot disappears from table

---

## 🧪 TECHNICAL VERIFICATION

### API Endpoints Check
Test these with Postman or curl:

**1. List Centres with Distance:**
```bash
curl "http://localhost:3000/api/v1/centres?latitude=31.6340&longitude=74.8711&radius=50" \
  -H "Authorization: Bearer {token}"
```

**Response includes:**
```json
{
  "success": true,
  "data": [{
    "name": "Amritsar Centre",
    "distance": 0.0,
    "congestionLevel": "MEDIUM",
    "estimatedWaitMinutes": 225,
    "currentQueueLength": 15
  }]
}
```

**2. Get Smart Recommendations:**
```bash
curl "http://localhost:3000/api/v1/recommendations/centres?latitude=31.6340&longitude=74.8711&radius=50" \
  -H "Authorization: Bearer {token}"
```

**Response includes:**
```json
{
  "success": true,
  "data": {
    "recommendations": [{
      "score": 91,
      "distanceKm": 0.0,
      "congestionLevel": "MEDIUM",
      "estimatedWaitMinutes": 225
    }]
  }
}
```

**3. Create Slot:**
```bash
curl -X POST "http://localhost:3000/api/v1/centres/{centreId}/slots" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "slot_date": "2026-09-05",
    "start_time": "11:00",
    "end_time": "12:00",
    "capacity": 25
  }'
```

---

## ❓ TROUBLESHOOTING

### Issue: "Cannot find module 'distance.js'"
**Solution:**
- Check if file exists: `backend/src/utils/distance.js`
- Ensure backend is restarted after file creation
- Clear node_modules: `rm -rf node_modules && npm install`

### Issue: Map not showing
**Solution:**
- Install Leaflet: `npm install leaflet leaflet-react`
- Check browser console for errors (F12)
- Ensure internet connection (needs OSM tiles)

### Issue: "401 Unauthorized" on API calls
**Solution:**
- Make sure you're logged in
- Token stored in localStorage
- Check Auth header is being sent

### Issue: No centres showing
**Solution:**
- Run seed script: `node seed-centres.js`
- Check database connection
- Verify database has data: `psql` → `SELECT * FROM "ProcurementCentre";`

### Issue: Frontend shows blank pages
**Solution:**
- Check browser console (F12) for errors
- Ensure backend is running on :3000
- Verify VITE_API_URL environment variable

---

## 📊 SAMPLE DATA OVERVIEW

### 6 Centres Created:

| Centre Name | Code | Location | Capacity | Queue Data |
|-------------|------|----------|----------|-----------|
| Amritsar | AMR-001 | 31.6340, 74.8711 | 100 | Random 0-30 |
| Ludhiana | LUD-001 | 30.9010, 75.8573 | 150 | Random 0-30 |
| Jalandhar | JAL-001 | 31.8261, 75.5762 | 120 | Random 0-30 |
| Patiala | PAT-001 | 30.3398, 76.3869 | 100 | Random 0-30 |
| Bathinda | BAT-001 | 29.7589, 74.9126 | 80 | Random 0-30 |
| Mohali | MOH-001 | 30.6394, 76.8198 | 110 | Random 0-30 |

### Slots Per Centre:
- 7 days of data (today + 6 days)
- 3 slots per day (Morning: 9-11, Afternoon: 12-14, Evening: 15-17)
- Random bookings (0-30 per slot)
- Total: 126 slots (6 × 21)

---

## 🎮 INTERACTIVE TEST SCENARIOS

### Scenario A: Find Nearest Centre (5 min)
1. Open Find Centre page
2. Allow location access
3. See centres sorted by distance
4. Amritsar should be first (0.0 km)
5. Try different radiuses

### Scenario B: Best Recommendation (3 min)
1. Click "Get Smart Recommendations"
2. See score breakdown
3. Top should have score ~90+
4. Notice why it's ranked highest

### Scenario C: Manage Centre (5 min)
1. Login as manager
2. Go to Centre Manager Dashboard
3. View current slots
4. Create new slot for tomorrow
5. Edit existing slot capacity
6. View statistics

### Scenario D: Map Visualization (2 min)
1. On Find Centre page
2. Click "Show Map View"
3. See all 6 centres on map
4. Amritsar should be in top-left area
5. Bathinda in bottom-right

---

## ✅ SUCCESS CRITERIA

You'll know everything is working when:

- ✅ Seed script runs without errors
- ✅ Both servers start successfully
- ✅ UI pages load (no 404 errors)
- ✅ Farmer can see 6+ centres with distance
- ✅ Smart recommendations show scores
- ✅ Manager can create/edit/delete slots
- ✅ Map displays with centre pins
- ✅ Congestion colors match queue length
- ✅ All buttons/forms are functional
- ✅ No console errors (F12)

---

## 📱 URLs to Test

| Page | URL | Role |
|------|-----|------|
| Smart Centre Finder | http://localhost:5173/find-centre | Farmer |
| Centre Manager | http://localhost:5173/centre-manager/[centreId] | Manager |
| Dashboard | http://localhost:5173/dashboard | Any |
| Login | http://localhost:5173/login | Public |

---

## 🎓 WHAT YOU'LL LEARN

By testing, you'll understand:
- ✅ How distance calculations work
- ✅ How smart recommendations rank centres
- ✅ How slots are managed operationally
- ✅ Real-time data aggregation
- ✅ Role-based access control
- ✅ React + Express integration
- ✅ Database relationships

---

## 📞 SUPPORT

**If something doesn't work:**
1. Check browser console (F12 → Console tab)
2. Check backend terminal for errors
3. Verify database is running
4. Try hard refresh (Ctrl+Shift+R)
5. Restart both servers

**Quick Commands:**
```bash
# Check if servers are running
lsof -i :3000    # Backend
lsof -i :5173    # Frontend

# Reset everything
rm -rf node_modules
npm install
npm run dev
```

---

## 🎉 YOU'RE READY!

Go ahead and:
1. Run the seed script
2. Start both servers
3. Open http://localhost:5173
4. Create an account
5. Explore the smart centre finder
6. Try the manager dashboard

**Enjoy testing the Procurement Centre APIs! 🚀**

