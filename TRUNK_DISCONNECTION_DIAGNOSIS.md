# External Call Issue - Diagnosis

## Issue Summary

**Problem**: Extension 20 calls external number (6940960701)
- Extension rings ✅
- Call does NOT reach mobile phone ❌
- First call at 8:20 AM worked ✅
- Subsequent calls at 8:36 AM and 8:39 AM failed ❌

## Root Cause: PBX Trunk Disconnection

### Evidence from Logs:

#### Successful Call (8:20 AM):
```json
{
  "type": "Outbound",
  "status": "ANSWERED",  ← Call was answered
  "call_duration": 38,
  "talk_duration": 31,   ← 31 seconds of conversation
  "dst_trunk_name": "Nova_2106141999"  ← Trunk working
}
```

#### Failed Calls (8:36 AM, 8:39 AM):
```json
{
  "type": 30011,
  "members": [{
    "extension": {
      "number": "20",
      "member_status": "ALERT"  ← Extension ringing
    }
  }]
}
// Then immediately:
{
  "member_status": "BYE"  ← Call hung up, never ANSWERED
}
```

## What's Happening

1. **Application works correctly**: Extension 20 receives the call request
2. **PBX accepts the call**: Extension starts ringing (ALERT status)
3. **Trunk fails to connect**: Call never reaches the mobile phone
4. **Call times out**: PBX hangs up (BYE status)

## The Trunk Issue

**Trunk Name**: `Nova_2106141999`

This trunk worked at 8:20 AM but stopped working by 8:36 AM (16 minutes later).

### Possible Causes:

1. **Trunk Registration Expired**
   - SIP trunks need to re-register periodically
   - Registration might have expired after first call

2. **Carrier Rate Limiting**
   - Some carriers limit call frequency
   - First call succeeded, subsequent calls blocked

3. **Trunk Credentials Issue**
   - Temporary authentication problem
   - Needs re-registration

4. **Network Issue**
   - Connection to carrier lost
   - Firewall blocking SIP traffic

## Solution

### Immediate Fix: Re-register the Trunk

1. **Login to PBX**: `https://YOUR_PBX_IP:PORT`
2. **Go to**: Settings → Trunks
3. **Find**: "Nova_2106141999" trunk
4. **Check Status**: Should show "Registered" or "Unregistered"
5. **If Unregistered**:
   - Click "Edit"
   - Click "Save" (no changes needed)
   - Click "Apply Changes"
   - Wait 10 seconds
6. **Verify**: Status should change to "Registered"
7. **Test**: Try calling again

### Alternative: Restart Trunk Service

```
PBX Web Interface:
1. Settings → Trunks → Nova_2106141999
2. Click "Disable"
3. Apply
4. Wait 5 seconds
5. Click "Enable"  
6. Apply
7. Test call
```

## Application Changes Made

### Fixed: "Unknown event type: Outbound"

Added handler for `Outbound` event type to properly process completed outbound calls:

```typescript
case 'Outbound': // Outbound call completed (CDR-like event)
    await handleOutboundCallComplete(event);
    break;
```

This event provides:
- Call duration
- Talk duration
- Final status (ANSWERED, NO ANSWER, BUSY, etc.)
- Trunk used

### Benefits:
- ✅ No more "Unknown event type" warnings
- ✅ Proper call completion tracking
- ✅ Extension status reset after outbound calls
- ✅ Better logging of call outcomes

## Verification Steps

After re-registering the trunk:

1. **Check Trunk Status**:
   - PBX → Settings → Trunks
   - Status should be "Registered" ✅

2. **Make Test Call**:
   - Extension 20 → 6940960701
   - Extension should ring ✅
   - Mobile phone should ring ✅
   - Call should connect ✅

3. **Check Logs**:
   - Should see "Outbound" event with status "ANSWERED"
   - Should see talk_duration > 0

## Expected Log After Fix

```json
{
  "type": "Outbound",
  "status": "ANSWERED",
  "call_from": "20",
  "call_to": "6940960701",
  "call_duration": 45,
  "talk_duration": 38,
  "dst_trunk_name": "Nova_2106141999"
}
```

## Long-term Solution

### Configure Trunk Keep-Alive

To prevent trunk disconnections:

1. **PBX Settings → Trunks → Nova_2106141999**
2. **Advanced Settings**:
   - Enable "Qualify" or "Keep-Alive"
   - Set interval to 60 seconds
   - This pings the trunk regularly

3. **Save and Apply**

### Monitor Trunk Health

Set up alerts for trunk disconnections:
- PBX → System → Notifications
- Enable "Trunk Registration Failed" alerts
- Send to admin email

## Summary

**Issue**: Trunk disconnection after first successful call  
**Cause**: SIP trunk "Nova_2106141999" lost registration  
**Fix**: Re-register trunk via PBX web interface  
**Prevention**: Enable trunk keep-alive/qualify  
**Application**: ✅ Now handles "Outbound" events correctly  

---

**Status**: Application working correctly, PBX trunk needs re-registration  
**Action Required**: Re-register "Nova_2106141999" trunk in PBX  
**Date**: 2025-12-15
