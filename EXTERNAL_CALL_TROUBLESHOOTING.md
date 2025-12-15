# External Call Troubleshooting Guide

## Issue Description
Extension 20 calls external number (6940960701) but:
- Extension 20 starts ringing ✅
- Call does NOT reach the mobile phone ❌
- First call 10 minutes ago worked ✅
- Subsequent calls fail ❌

## This is a PBX Configuration Issue

The application code is working correctly (extension rings), but the PBX is not routing the call to the external number.

## Possible Causes

### 1. **Trunk/Outbound Route Issue**
The PBX trunk (connection to phone carrier) might be:
- Disconnected
- Out of credit
- Experiencing temporary issues
- Blocked by carrier

### 2. **Call Limit Reached**
Some PBX configurations have:
- Maximum concurrent calls limit
- Call rate limiting
- Daily call limits

### 3. **Dial Pattern Mismatch**
The outbound route might not match the number format:
- Number: `6940960701`
- Expected format might be: `+306940960701` or `00306940960701`

### 4. **Trunk Registration Failed**
The SIP trunk might have disconnected after the first call.

## Immediate Checks

### Check 1: PBX Trunk Status

1. **Login to PBX web interface**: `https://YOUR_PBX_IP:PORT`
2. **Go to**: Settings → Trunks → SIP Trunks
3. **Check Status**: Should show "Registered" or "Connected"
4. **If "Unregistered"**: 
   - Click "Apply" to re-register
   - Check trunk credentials
   - Contact your SIP provider

### Check 2: Outbound Routes

1. **Go to**: Settings → Call Control → Outbound Routes
2. **Find route** for mobile numbers (69XXXXXXXX)
3. **Check**:
   - Pattern matches: `6940960701`
   - Trunk is selected
   - Route is enabled

### Check 3: Call Logs in PBX

1. **Go to**: Reports → Call Logs or CDR
2. **Find the failed call**
3. **Check "Hangup Cause"**:
   - "NO_ROUTE_DESTINATION" → Routing issue
   - "CALL_REJECTED" → Trunk issue
   - "USER_BUSY" → Trunk busy
   - "NORMAL_CLEARING" → Call completed (but didn't reach)

### Check 4: Extension Permissions

1. **Go to**: Settings → Extensions → Extension 20
2. **Check "Outbound Routes"**:
   - Ensure extension has permission for external calls
   - Check if there's a call limit

## Quick Fixes

### Fix 1: Re-register Trunk

```
PBX Web Interface:
1. Settings → Trunks
2. Find your SIP trunk
3. Click "Edit"
4. Click "Save" (even without changes)
5. Click "Apply Changes"
```

### Fix 2: Check Dial Pattern

The number might need a prefix:

**Current**: `6940960701`
**Try**: 
- `0030 6940960701` (international format)
- `+30 6940960701` (E.164 format)
- `0 6940960701` (with leading 0)

### Fix 3: Restart Trunk

```
PBX Web Interface:
1. Settings → Trunks
2. Disable trunk
3. Apply
4. Enable trunk
5. Apply
```

### Fix 4: Check Account Balance

If using a paid SIP trunk:
1. Login to your SIP provider portal
2. Check account balance
3. Check call limits
4. Check if account is suspended

## Application Logs to Check

### Check Server Console

Look for these logs when making the call:

```bash
# Success:
📞 Dialing 20 -> 6940960701 via /extension/dial...
✅ Call initiated successfully: call_id_here

# Failure:
📞 Dialing 20 -> 6940960701 via /extension/dial...
❌ PBX API Error 10XXX: Error message
```

### Check PBX Logs Page

1. Go to: **Dashboard → PBX → Logs**
2. Look for errors around the time of the call
3. Check for:
   - "Call Failed" events
   - "Trunk Error" events
   - Error codes

## Common Error Codes

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 403 | Forbidden | Check extension permissions |
| 404 | Not Found | Check trunk configuration |
| 480 | Temporarily Unavailable | Trunk is down |
| 486 | Busy Here | All trunk lines busy |
| 503 | Service Unavailable | Trunk not registered |
| 604 | Does Not Exist Anywhere | Invalid number format |

## Test Procedure

### Test 1: Call from Physical Phone

1. Pick up extension 20's physical phone
2. Dial `6940960701` directly
3. **If it works**: Application issue
4. **If it fails**: PBX configuration issue

### Test 2: Call Another Extension

1. From dashboard, call extension 20 → extension 21
2. **If it works**: External routing issue
3. **If it fails**: Application issue

### Test 3: Call with Different Format

Try calling with different number formats:
- `6940960701` (current)
- `0030 6940960701`
- `+30 6940960701`
- `00 30 6940960701`

## PBX Configuration Steps

### Step 1: Verify Trunk Settings

```
Settings → Trunks → Your SIP Trunk

Required Settings:
- Host: Your SIP provider's server
- Username: Your SIP username
- Password: Your SIP password
- Registration: Enabled
- Status: Registered ✅
```

### Step 2: Verify Outbound Route

```
Settings → Call Control → Outbound Routes

Create/Edit Route:
- Name: "Mobile Calls"
- Dial Patterns: 69XXXXXXXX (or appropriate pattern)
- Trunk: Your SIP Trunk
- Enabled: Yes ✅
```

### Step 3: Verify Extension Permissions

```
Settings → Extensions → Extension 20

Permissions:
- Outbound Routes: Select "Mobile Calls" ✅
- Call Limit: Unlimited or appropriate value
```

## Debugging Commands

### Check Trunk Registration (SSH to PBX)

```bash
# If you have SSH access to PBX
asterisk -rx "sip show registry"
# Should show: Registered

asterisk -rx "sip show peers"
# Should show your trunk as OK

asterisk -rx "core show channels"
# Shows active calls
```

## Contact Information

If issue persists:

1. **Check with SIP Provider**:
   - Verify account is active
   - Check for service outages
   - Verify trunk credentials

2. **Check PBX Logs**:
   - Full call detail records
   - Trunk registration logs
   - Error messages

3. **Test from PBX Directly**:
   - Use physical phone
   - Dial the number manually
   - Confirm PBX can make external calls

## Temporary Workaround

If external calls are not working:

1. **Use internal calls only** (extension to extension)
2. **Contact your SIP provider** to resolve trunk issues
3. **Check PBX system logs** for detailed error messages

## Application Code Status

✅ **Application is working correctly**:
- API call to PBX succeeds
- Extension starts ringing
- Call record created

❌ **PBX is not routing the call**:
- Trunk might be down
- Outbound route not configured
- Number format mismatch

## Next Steps

1. ✅ Login to PBX web interface
2. ✅ Check trunk status (Settings → Trunks)
3. ✅ Check outbound routes (Settings → Call Control)
4. ✅ Check PBX call logs (Reports → CDR)
5. ✅ Test call from physical phone
6. ⚠️ Contact SIP provider if trunk is down

---

**Issue Type**: PBX Configuration  
**Application Status**: ✅ Working  
**PBX Status**: ⚠️ Needs configuration check  
**Date**: 2025-12-15
