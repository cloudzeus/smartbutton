# WebSocket Disconnection Cleanup - Implementation

## Overview
When the PBX WebSocket connection is lost, the system automatically cleans up all active states to prevent stale UI and data inconsistencies.

## What Gets Cleaned Up

### Backend Cleanup (Automatic)

When WebSocket closes:

1. **Extension Statuses** → Reset to 'online'
   - All 'ringing' extensions → 'online'
   - All 'incall' extensions → 'online'
   - All 'busy' extensions → 'online'

2. **Active Calls** → Marked as 'ended'
   - All 'calling' calls → 'ended'
   - All 'ringing' calls → 'ended'
   - All 'connected' calls → 'ended'
   - All 'active' calls → 'ended'

3. **Event Emission** → Notify frontend
   - Emits 'pbx-disconnected' event via event bus

### Frontend Cleanup (Automatic)

When disconnection is detected:

1. **Modals** → Closed
   - Call dialog closes
   - No stuck modals

2. **Call States** → Reset
   - callStatus → 'idle'
   - activeCallId → null
   - activeCallDetails → null

3. **Audio** → Stopped
   - Ring sound stops
   - Announcement stops
   - Audio refs cleared

4. **Flags** → Reset
   - hasPlayedAnnouncement → false

## Cleanup Flow

```
1. WebSocket connection lost
   ↓
2. Backend: stopHeartbeat()
   ↓
3. Backend: cleanupOnDisconnect()
   ↓
4. Database: Reset all extensions to 'online'
   ↓
5. Database: Mark all active calls as 'ended'
   ↓
6. Event Bus: Emit 'pbx-disconnected'
   ↓
7. Frontend: Polls and sees all extensions online
   ↓
8. Frontend: Closes modals, stops audio
   ↓
9. WebSocket: Schedules reconnection (5 seconds)
   ↓
10. Reconnection attempt
   ↓
11. If successful: Resume normal operation
```

## Console Output

### When Disconnection Occurs:

```
⚠️ PBX WebSocket Closed. Cleaning up states...
🧹 Cleaning up active call states and extension statuses...
✅ Reset 3 extensions to online
✅ Marked 2 active calls as ended
✅ Cleanup complete - ready for reconnection
⚠️ PBX disconnected - Cleaning up UI states
✅ UI states cleaned up
🔄 Reconnecting to PBX WebSocket in 5s...
```

### When Reconnection Succeeds:

```
🔌 Connecting to PBX WebSocket: 192.168.1.100
✅ PBX WebSocket Connected!
💓 Starting heartbeat (interval: 30s)
📡 Subscribing to PBX events...
✅ Event Subscription Successful
```

## Database Queries

### Reset Extensions:
```sql
UPDATE Extension
SET status = 'online', lastSeen = NOW()
WHERE status IN ('ringing', 'incall', 'busy');
```

### End Active Calls:
```sql
UPDATE Call
SET status = 'ended', endTime = NOW()
WHERE status IN ('calling', 'ringing', 'connected', 'active');
```

## Benefits

✅ **No Stale States** - Extensions don't stay "busy" forever
✅ **Clean Reconnection** - Fresh start when connection restored
✅ **No Stuck Modals** - UI resets properly
✅ **No Audio Loops** - Ring sounds stop immediately
✅ **Data Integrity** - Calls properly marked as ended

## Edge Cases Handled

### Case 1: Call in Progress When Disconnect
```
Before: Extension 20 is 'incall' with active call
Disconnect occurs
After: Extension 20 is 'online', call marked 'ended'
```

### Case 2: Multiple Extensions Ringing
```
Before: Extensions 20, 30, 40 all 'ringing'
Disconnect occurs
After: All extensions 'online', all calls 'ended'
```

### Case 3: Modal Open During Disconnect
```
Before: Call modal open, ring sound playing
Disconnect occurs
After: Modal closed, ring sound stopped, states reset
```

### Case 4: Reconnection While Calls Active
```
Before: Real calls happening on PBX
Disconnect → Cleanup → Reconnect
After: New events will update statuses correctly
```

## Reconnection Behavior

### Normal Reconnection (5 seconds):
```typescript
scheduleReconnect(); // Default 5000ms
```

### IP Blocked Reconnection (11 minutes):
```typescript
scheduleReconnect(11 * 60 * 1000); // 660000ms
```

This prevents hammering the PBX when IP is blocked.

## Testing

### Test Disconnection Cleanup:

1. **Start a call** between two extensions
2. **Verify** both show 'incall' status (purple)
3. **Stop the PBX** or disconnect network
4. **Observe** console logs show cleanup
5. **Verify** both extensions reset to 'online' (green)
6. **Verify** modal closes if open
7. **Verify** ring sound stops if playing
8. **Restart PBX** or restore network
9. **Observe** reconnection succeeds
10. **Verify** system works normally

### Expected Behavior:

✅ Extensions reset to green within 3 seconds (next poll)
✅ Modal closes immediately
✅ Audio stops immediately
✅ Call logs show calls as 'ended'
✅ Reconnection happens automatically
✅ New calls work after reconnection

## Monitoring

### Check Cleanup Effectiveness:

```sql
-- Should be 0 after cleanup
SELECT COUNT(*) FROM Extension 
WHERE status IN ('ringing', 'incall', 'busy');

-- Should be 0 after cleanup
SELECT COUNT(*) FROM Call 
WHERE status IN ('calling', 'ringing', 'connected', 'active');
```

### Check Reconnection Status:

```bash
# Check server logs
tail -f logs/app.log | grep "WebSocket"
```

## Troubleshooting

### Extensions Still Show Busy After Disconnect

**Cause**: Cleanup didn't run or database update failed

**Fix**:
```sql
UPDATE Extension SET status = 'online';
```

### Modal Won't Close

**Cause**: Frontend cleanup didn't trigger

**Fix**: Refresh the page

### Calls Not Marked as Ended

**Cause**: Database update failed

**Fix**:
```sql
UPDATE Call SET status = 'ended', endTime = NOW()
WHERE endTime IS NULL;
```

### Reconnection Not Happening

**Cause**: Reconnection timer not scheduled

**Fix**: Restart the server

## Configuration

### Reconnection Delay:
```typescript
// In pbx-websocket-listener.ts
const RECONNECT_DELAY = 5000; // 5 seconds (default)
```

### Heartbeat Interval:
```typescript
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
```

### Frontend Polling:
```typescript
// In extensions/page.tsx
const POLL_INTERVAL = 3000; // 3 seconds
```

## Security Considerations

✅ **No Data Loss** - Calls are marked 'ended', not deleted
✅ **Audit Trail** - Cleanup events logged
✅ **Graceful Degradation** - System continues to work
✅ **Automatic Recovery** - Reconnects automatically

---

**Status**: ✅ Fully Implemented
**Date**: 2025-12-15
**Impact**: Prevents stale states on disconnection
**Reconnection**: Automatic (5 seconds)
