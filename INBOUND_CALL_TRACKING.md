# Inbound Call Tracking - Implementation Summary

## Overview
The system now tracks ALL call types and updates extension status in real-time, so users can see when extensions are busy and unavailable to call.

## Call Types Tracked

### 1. **Outbound Calls** (Extension → External Number)
- Example: Extension 20 calls 6940960701
- Event: "Outbound" CDR
- Status updates: Extension shows 'incall' when answered

### 2. **Inbound Calls** (External Number → Extension)  
- Example: 6940960701 calls Extension 40
- Event: "Inbound" CDR
- Status updates: Extension shows 'incall' when answered

### 3. **Internal Calls** (Extension → Extension)
- Example: Extension 502 calls Extension 503
- Event: Event 30011 with multiple members
- Status updates: Both extensions show 'incall' when answered

## How It Works

### Real-Time Status Updates (Event 30011)

When a call is answered, we receive Event 30011 with member_status:

```json
{
  "type": 30011,
  "call_id": "...",
  "members": [
    {
      "extension": {
        "number": "40",
        "member_status": "ANSWER"  ← Extension answered
      }
    }
  ]
}
```

**Our webhook handler:**
1. Detects `member_status: "ANSWER"`
2. Updates extension status to `'incall'`
3. Updates Call record to `'connected'`
4. Frontend polls and sees extension is busy

### Call Completion Events

When call ends, we receive CDR events:

**Outbound:**
```json
{
  "type": "Outbound",
  "call_from": "20",
  "call_to": "6940960701",
  "status": "ANSWERED",
  "talk_duration": 45
}
```

**Inbound:**
```json
{
  "type": "Inbound",
  "call_from": "6940960701",
  "call_to": "40",
  "status": "ANSWERED",
  "talk_duration": 120
}
```

**Our webhook handler:**
1. Saves call duration
2. Resets extension status to `'online'`
3. Marks call as `'completed'`

## Extension Status Flow

### For Inbound Call (External → Extension 40):

```
1. External number calls Extension 40
   ↓
2. Event 30011: member_status = "RING"
   ↓
3. Extension 40 status → 'ringing' (orange)
   ↓
4. Extension 40 picks up phone
   ↓
5. Event 30011: member_status = "ANSWER"
   ↓
6. Extension 40 status → 'incall' (purple) ✨
   ↓
7. Users see Extension 40 is BUSY
   ↓
8. Call button disabled for Extension 40
   ↓
9. Call ends
   ↓
10. Event "Inbound": status = "ANSWERED"
   ↓
11. Extension 40 status → 'online' (green)
   ↓
12. Extension 40 available again
```

## UI Indicators

### Extension Card Colors:
- 🟢 **Green** = Online, available to call
- 🟠 **Orange** = Ringing, incoming call
- 🟣 **Purple** = In call, BUSY - don't call!
- ⚫ **Gray** = Offline

### Call Button States:
- ✅ **Enabled** = Extension is online, can call
- ❌ **Disabled** = Extension is busy/offline, can't call

## Events We Handle

| Event Type | Description | Action |
|------------|-------------|--------|
| 30011 | Call State Changed | Update extension status (RING/ANSWER/BYE) |
| 30020 | Call Session | Track call start/end |
| Outbound | Outbound call CDR | Save duration, reset status |
| Inbound | Inbound call CDR | Save duration, reset status |

## Database Updates

### When Call is Answered:
```sql
-- Update extension
UPDATE Extension 
SET status = 'incall', lastSeen = NOW()
WHERE extensionId = '40';

-- Update call
UPDATE Call
SET status = 'connected', answerTime = NOW()
WHERE callId = '...';
```

### When Call Ends:
```sql
-- Update extension
UPDATE Extension
SET status = 'online', lastSeen = NOW()
WHERE extensionId = '40';

-- Update call
UPDATE Call
SET status = 'completed', endTime = NOW(), duration = 120
WHERE callId = '...';
```

## Frontend Polling

The frontend polls `/api/extensions` every 3 seconds:

```typescript
useEffect(() => {
    fetchExtensions();
    const interval = setInterval(fetchExtensions, 3000);
    return () => clearInterval(interval);
}, []);
```

This ensures the UI always shows current extension status.

## Testing

### Test Inbound Call:
1. Call Extension 40 from external phone
2. Extension 40 card should show **orange** (ringing)
3. Answer the call on Extension 40
4. Extension 40 card should show **purple** (incall)
5. Call button should be **disabled**
6. Hang up the call
7. Extension 40 card should show **green** (online)
8. Call button should be **enabled** again

### Test Outbound Call:
1. Click Extension 20 card → Call
2. Enter external number
3. Extension 20 rings
4. Answer Extension 20
5. Extension 20 card shows **purple** (incall)
6. Hang up
7. Extension 20 card shows **green** (online)

### Test Internal Call:
1. Extension 502 calls Extension 503
2. Extension 503 shows **orange** (ringing)
3. Extension 503 answers
4. Both 502 and 503 show **purple** (incall)
5. Either hangs up
6. Both show **green** (online)

## Console Logs

### When Inbound Call Answered:
```
✅ Extension 40 status updated: incall (member_status: ANSWER)
✅ Call 1765782033.000067 marked as CONNECTED (answered by: 40)
```

### When Inbound Call Ends:
```
✅ Inbound call completed: 1765782033.000067 (answered, duration: 120s)
```

## Benefits

✅ **Real-time status** - See who's on a call instantly
✅ **Prevent interruptions** - Can't call busy extensions
✅ **Better UX** - Visual indicators (colors)
✅ **Call tracking** - All calls logged with duration
✅ **Works for all call types** - Inbound, outbound, internal

## Known Limitations

⚠️ **PBX must send events** - If PBX doesn't send Event 30011, status won't update
⚠️ **Polling delay** - Up to 3 seconds before UI updates
⚠️ **Requires webhook** - PBX must be configured to send events to our webhook

## Troubleshooting

### Extension Stuck in 'incall' Status

**Cause**: Call ended but we didn't receive the end event

**Fix**:
```sql
-- Manually reset extension
UPDATE Extension SET status = 'online' WHERE extensionId = '40';
```

### Extension Not Showing Busy

**Cause**: Not receiving Event 30011 with ANSWER status

**Check**:
1. PBX webhook is configured correctly
2. Events are reaching `/api/pbx/webhook`
3. Check PBX Logs page for events

### Call Duration Not Showing

**Cause**: Inbound/Outbound CDR event not received

**Check**:
1. Look for "Inbound" or "Outbound" events in logs
2. Verify `talk_duration` field exists in event

---

**Status**: ✅ Fully Implemented
**Date**: 2025-12-15
**Tracks**: Inbound, Outbound, and Internal calls
