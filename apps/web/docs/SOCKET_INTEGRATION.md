# Socket.IO Integration - Step by Step Explanation

## Overview
We've implemented real-time presence tracking (online/offline indicators) for conversations using Socket.IO. Here's how everything works together.

---

## Architecture

```
App.tsx
  └─ ClerkProvider (Authentication)
      └─ StoreProvider (Redux)
          └─ SocketProvider (Socket.IO + Presence) ← NEW
              └─ ChatContainer
                  └─ ConversationList
                      └─ ConversationItem (shows online status) ✅
```

---

## Step-by-Step Flow

### Step 1: Socket Connection (`useSocket.ts`)

**What it does:**
- Creates a Socket.IO connection to the backend
- Automatically includes Clerk JWT token for authentication
- Handles reconnection if connection drops
- Refreshes token if authentication fails

**How it works:**
1. Waits for Clerk to load and user to sign in
2. Gets JWT token from Clerk using `getToken()`
3. Connects to backend with token in `auth` field
4. Listens for `connect`, `disconnect`, `connect_error` events
5. Updates connection state (`isConnected`, `isConnecting`)

**When it runs:**
- On component mount (after Clerk loads)
- Auto-reconnects if connection drops
- Recreates connection if token expires

---

### Step 2: Presence Tracking (`usePresence.ts`)

**What it does:**
- Listens for `user:online` and `user:offline` socket events
- Maintains a Map of userId → boolean (online status)
- Sends heartbeat every 25 seconds to stay online

**How it works:**
1. When a user connects, backend broadcasts `user:online` event
2. Hook receives event and marks user as online in Map
3. When user disconnects, backend sends `user:offline` 
4. Hook updates Map to mark user as offline
5. Heartbeat prevents automatic offline status during idle

**Data structure:**
```typescript
Map {
  "user_123" => true,   // online
  "user_456" => false,  // offline
  "user_789" => true    // online
}
```

---

### Step 3: Socket Context (`SocketContext.tsx`)

**What it does:**
- Combines socket connection + presence tracking
- Provides both to all child components via React Context
- Single source of truth for socket state

**Exports:**
- `socket`: Socket.IO instance (for emitting events)
- `isConnected`: Boolean for connection status
- `isUserOnline(userId)`: Function to check if user is online
- `onlineUsers`: Map of all tracked users

**Why Context?**
- Avoids prop drilling through many components
- Ensures single socket connection (not one per component)
- Easy to access from any component

---

### Step 4: Integration in App (`App.tsx`)

**Provider hierarchy:**
```tsx
<ClerkProvider>           ← Provides authentication
  <StoreProvider>         ← Provides Redux store
    <SocketProvider>      ← Provides socket + presence ✅
      <ChatContainer />   ← Can now access socket context
```

**Why this order?**
- SocketProvider needs Clerk (for JWT token)
- SocketProvider needs Redux (optional, for actions)
- All child components can now access socket

---

### Step 5: Using in ChatContainer

**Before:**
```tsx
isOnline: false  // hardcoded
```

**After:**
```tsx
const { isUserOnline } = useSocketContext();

isOnline: otherParticipant ? isUserOnline(otherParticipant.id) : false
```

**How it works:**
1. Get other participant from conversation
2. Get their MongoDB user ID (e.g., "69745e2c453a13b234432d93")
3. Call `isUserOnline(participantId)` to check status
4. Pass result to ConversationItem as `isOnline` prop

**Real-time updates:**
- When user connects → `user:online` event → Map updates → React re-renders
- When user disconnects → `user:offline` event → Map updates → React re-renders
- ConversationItem automatically shows green/gray dot

---

## Backend Socket Events (What We Listen To)

### `user:online`
**Received when:** Another user connects
**Payload:** `{ userId: string }`
**Action:** Mark user as online in Map

### `user:offline`
**Received when:** Another user disconnects (after 30s grace period)
**Payload:** `{ userId: string }`
**Action:** Mark user as offline in Map

### `presence:heartbeat` (we emit)
**Sent every:** 25 seconds
**Purpose:** Tell backend we're still active (prevents timeout)

---

## Visual Flow Example

```
User A opens chat:
1. useSocket connects to backend with JWT token
2. Backend broadcasts: user:online { userId: "user_A" }
3. All connected clients update their presence Map
4. User B's UI shows User A with green dot ✅

User A closes browser:
1. Socket disconnects
2. Backend waits 30 seconds (grace period)
3. Backend broadcasts: user:offline { userId: "user_A" }
4. User B's UI shows User A with gray dot ✅
```

---

## Important Notes

### Why MongoDB User IDs?
- Backend presence events use MongoDB `_id` (e.g., "69745e2c...")
- NOT Clerk IDs (user_xxx)
- ChatContainer already extracts participant MongoDB IDs from conversation data

### Automatic Reconnection
- If WiFi drops, Socket.IO auto-reconnects
- If token expires, hook refreshes it automatically
- No manual intervention needed

### Performance
- Only ONE socket connection per user
- Heartbeat is lightweight (empty event)
- Map lookups are O(1) - very fast

### Testing
1. Open chat in two different browsers
2. Sign in as different users in each
3. You should see green dots appear/disappear as users connect/disconnect

---

## Next Steps (Optional Enhancements)

### 1. Typing Indicators
Already set up to add:
```typescript
socket.on('typing:user', (data) => {
  // data: { userId, conversationId, isTyping }
  // Update conversation to show "User is typing..."
});
```

### 2. Real-time Messages
```typescript
socket.on('message:new', (data) => {
  // data: { message }
  // Add message to conversation in Redux store
});
```

### 3. Read Receipts
```typescript
socket.emit('message:read', { messageId });
```

### 4. Connection Status Indicator
```tsx
const { isConnected } = useSocketContext();
{!isConnected && <div>Reconnecting...</div>}
```

---

## Troubleshooting

### "useSocketContext must be used within SocketProvider"
**Fix:** Make sure SocketProvider is in App.tsx above ChatContainer

### Online status not updating
**Check:**
1. Backend Socket.IO server is running
2. Browser console shows "✅ Socket connected"
3. Backend logs show "User connected" messages

### Users always show offline
**Check:**
1. Backend is broadcasting `user:online` events
2. Participant IDs match MongoDB `_id` format
3. Console log `onlineUsers` Map to see tracked users

---

## File Structure

```
apps/web/src/
├── hooks/
│   ├── useSocket.ts           ← Socket connection management
│   └── usePresence.ts         ← Online/offline tracking
├── contexts/
│   └── SocketContext.tsx      ← Context provider
├── components/
│   └── layout/
│       └── ChatContainer.tsx  ← Uses isUserOnline()
└── App.tsx                    ← Adds SocketProvider
```

---

**Status:** ✅ Online/Offline indicators fully implemented
**Next:** Install socket.io-client and test the integration
