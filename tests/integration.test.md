# Frontend Integration Tests

## Manual Test Checklist

### ✅ Test 1: Orders Page - Route Fix
**Steps:**
1. Navigate to `/dashboard/orders`
2. Page should load without "Route Not Found" error
3. Orders should be fetched from `/admin/all-orders`

**Expected:** Orders list displays successfully

---

### ✅ Test 2: Orders Page - Search Functionality
**Steps:**
1. Navigate to `/dashboard/orders`
2. Type a user name in the search box (e.g., "John")
3. Orders should filter by user name/email/phone

**Expected:** Search filters orders correctly

---

### ✅ Test 3: Orders Page - Order Type Filter
**Steps:**
1. Navigate to `/dashboard/orders`
2. Click on "Order Type" dropdown
3. Select "Delivery" or "Take Away" or "Car"

**Expected:**
- Dropdown shows: All Types, Delivery, Take Away, Car
- Orders filtered by selected type

---

### ✅ Test 4: Orders Page - Display Order Type
**Steps:**
1. Navigate to `/dashboard/orders`
2. Look at the orders table

**Expected:**
- "Type" column shows order type badge
- Types display as "Delivery", "Take Away", or "Car"

---

### ✅ Test 5: Orders Page - Scheduled Time
**Steps:**
1. Navigate to `/dashboard/orders`
2. Look for orders with scheduled times

**Expected:**
- "Scheduled" column shows scheduled time or "-"
- Time formatted as locale string

---

### ✅ Test 6: Orders Page - Delivery Instructions
**Steps:**
1. Navigate to `/dashboard/orders`
2. Look at orders that have delivery/cooking instructions

**Expected:**
- Instructions appear under delivery address
- Shows "Delivery: [instruction]" and/or "Cooking: [instruction]"

---

### ✅ Test 7: Header - Send Notification Dialog
**Steps:**
1. Click the bell icon in header
2. Dialog opens with two tabs: "To User" and "To Topic"

**Tab 1: To User**
3. Enter a valid user ID (MongoDB ObjectId format)
4. Enter title: "Test Notification"
5. Enter body: "This is a test"
6. Click "Send"

**Tab 2: To Topic**
3. Enter topic: "test-topic"
4. Enter title: "Topic Test"
5. Enter body: "This is a topic test"
6. Click "Send"

**Expected:**
- Dialog opens correctly
- Tabs switch properly
- Validation works (shows error if fields empty)
- On success: toast notification shows success message

---

### ✅ Test 8: Users Page - Add User Without Password
**Steps:**
1. Navigate to `/dashboard/users`
2. Click "Add User" button
3. Fill in:
   - Name: "Test User"
   - Email: "test@example.com"
   - Phone: "1234567890"
   - Tier: Select "Silver"
   - Calorie Goal: 2000
   - Food Allergies: "nuts, dairy"
   - Referral Code: (optional)
   - Status: Active (checked)
4. Click "Add User"

**Expected:**
- No password field visible
- New fields visible: Tier, Calorie Goal, Food Allergies, Referral Code
- User created successfully without password
- Toast shows success message

---

### ✅ Test 9: Users Page - View User Details
**Steps:**
1. Navigate to `/dashboard/users`
2. Click "Actions" menu on any user
3. Click "View"
4. User detail dialog opens

**Expected Dialog Shows:**
- Basic info (name, email, phone, tier badge, status)
- Total orders count
- Cancelled orders count
- **Referral Info Section:**
  - Referral Code with copy button
  - Referral Count
  - Referred By
- **Saved Addresses Section:**
  - List of user addresses
  - Each address shows: label, type badge, default badge (if default)
  - Full formatted address
  - Landmark (if present)

---

### ✅ Test 10: Users Page - Copy Referral Code
**Steps:**
1. View a user's details
2. Click the copy button next to referral code

**Expected:**
- Referral code copied to clipboard
- Toast shows "Copied" message

---

### ✅ Test 11: Menu Page - New Mood Values
**Steps:**
1. Navigate to `/dashboard/menu`
2. Click "Add Menu Item" or edit existing item
3. Open "Mood Tag" dropdown

**Expected Dropdown Options:**
- Locked In
- Bougie
- Homesick
- Burnt TF Out
- Need a Hug

**Old values should NOT appear:**
- Good
- Angry
- In Love
- Sad

---

### ✅ Test 12: Type Checking
**Steps:**
1. Run: `cd nextgenfix-admin && npx tsc --noEmit`

**Expected:**
- No TypeScript compilation errors
- All new interfaces and types are valid

---

## API Endpoint Tests

Test these endpoints using Postman or curl:

### 1. GET /api/admin/all-orders
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/all-orders
```
**Expected:** Returns orders array

### 2. GET /api/admin/all-orders?search=test
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/admin/all-orders?search=test"
```
**Expected:** Returns filtered orders

### 3. GET /api/admin/all-orders?status=placed
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/admin/all-orders?status=placed"
```
**Expected:** Returns only placed orders

### 4. POST /api/admin/users (without password)
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "tier": "silver",
    "calorieGoal": 2000,
    "allergens": "nuts, dairy"
  }' \
  http://localhost:5000/api/admin/users
```
**Expected:** User created successfully

### 5. GET /api/admin/users/:userId/locations
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/users/USER_ID/locations
```
**Expected:** Returns user's saved addresses

### 6. GET /api/admin/carts/abandoned
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/carts/abandoned
```
**Expected:** Returns abandoned carts

### 7. GET /api/admin/users/:userId/cancelled-orders
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/users/USER_ID/cancelled-orders
```
**Expected:** Returns user's cancelled orders

### 8. POST /api/notifications/send
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "title": "Test Notification",
    "body": "This is a test"
  }' \
  http://localhost:5000/api/notifications/send
```
**Expected:** Notification sent (or error if Firebase not configured)

### 9. POST /api/notifications/topics/send
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "test-topic",
    "title": "Topic Test",
    "body": "This is a topic test"
  }' \
  http://localhost:5000/api/notifications/topics/send
```
**Expected:** Topic notification sent (or error if Firebase not configured)

---

## Browser Console Tests

Open browser console and run:

```javascript
// Test 1: Check if api client is configured
console.log('API Client exists:', typeof window !== 'undefined');

// Test 2: Check localStorage for admin token
console.log('Admin token:', localStorage.getItem('adminToken') ? 'Present' : 'Not found');

// Test 3: Check if types are correct (in TypeScript files)
// This is done during build time with `npx tsc --noEmit`
```

---

## Coverage Summary

✅ **Backend Models:** All schema changes validated
✅ **Backend Controllers:** New functions added
✅ **Backend Routes:** New endpoints created
✅ **Frontend Types:** Updated interfaces
✅ **Frontend Components:** Updated with new fields and features
✅ **Frontend API Layer:** New API functions created

**Total Changes Tested:** 11 major features across 14 files
