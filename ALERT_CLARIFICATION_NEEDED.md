# Alert.mp3 Playback - Clarification Needed

## Current Understanding

### Scenario:
1. **Extension A (Caller)** - User in browser clicks "Call" button
2. **Extension B (Callee)** - Physical phone rings
3. **Extension B picks up** the physical phone
4. **Alert should play** - But to whom?

## Two Possible Approaches

### Approach 1: Play in Caller's Browser (Current)
```
Extension A (Browser) → Calls → Extension B (Phone)
                                        ↓
                                 Extension B answers
                                        ↓
                        Alert plays in Extension A's browser
```

**Pros**: 
- Easy to implement
- Works with current browser-based architecture
- Caller knows the call was answered

**Cons**:
- Callee (person who answered) doesn't hear the alert
- Only works if caller has browser open

### Approach 2: Play Through PBX to Callee (Requested?)
```
Extension A (Browser) → Calls → Extension B (Phone)
                                        ↓
                                 Extension B answers
                                        ↓
                        Alert plays through Extension B's phone speaker
```

**Pros**:
- Callee hears the alert when they answer
- Works even if no browser is open
- Professional call center experience

**Cons**:
- **Requires PBX support** for playing prompts
- P550 doesn't support `/prompt/upload` endpoint
- Need to find alternative PBX API method

## What You Want (Please Confirm)

Based on your comment: "the mp3 should be played to user the extension call and when he picks up the call"

I believe you want:
- **Extension B (the callee)** should hear alert.mp3
- **When Extension B picks up** their physical phone
- **Through the phone speaker** (not browser)

## Technical Challenge

### Problem:
The Yeastar P550 doesn't support the `/prompt/upload` endpoint (we got error 10001).

### Possible Solutions:

#### Solution 1: Use System Prompts
If P550 has built-in prompts, we can play those:
```typescript
POST /openapi/v1.0/call/playprompt
{
  "call_id": "xxx",
  "prompt_name": "system_prompt_name"
}
```

#### Solution 2: Use DTMF or Other Features
Some PBX systems support playing audio via other methods.

#### Solution 3: Keep Browser-Based (Current)
Play alert in the browser of whoever is logged in.

## Recommended Approach

### Option A: Play to Caller (Current Implementation)
- ✅ Works now
- ✅ No PBX limitations
- ✅ Provides feedback to caller
- ❌ Callee doesn't hear it

### Option B: Play to Callee via PBX
- ❌ Requires PBX API support
- ❌ P550 doesn't support prompt upload
- ✅ Professional experience
- ✅ Callee hears the alert

### Option C: Hybrid Approach
- Play in browser if user is logged in
- Show visual notification
- Use existing TTS for caller

## Questions for You

1. **Who should hear the alert?**
   - [ ] The caller (Extension A) - person who initiated the call
   - [ ] The callee (Extension B) - person who answered the call
   - [ ] Both

2. **Where should it play?**
   - [ ] In the browser (current implementation)
   - [ ] Through the phone speaker (requires PBX support)
   - [ ] Both

3. **When should it play?**
   - [ ] When call is answered (current)
   - [ ] Before call connects
   - [ ] After call connects

4. **Is the callee using the browser?**
   - [ ] Yes, they're logged into the dashboard
   - [ ] No, they're just using a physical phone
   - [ ] Sometimes

## Current Implementation Status

### What Works Now:
1. ✅ Modal closes when call is answered
2. ✅ Both extensions show 'incall' status
3. ✅ Alert.mp3 plays in **caller's browser**
4. ✅ TTS announcement plays in **caller's browser**
5. ✅ Red hangup buttons appear

### What Doesn't Work:
1. ❌ Alert.mp3 doesn't play through **callee's phone speaker**
2. ❌ P550 doesn't support prompt upload

## Next Steps

Please clarify:
1. Should alert play to **caller** or **callee**?
2. Should it play in **browser** or **phone speaker**?
3. Is the callee typically **logged into the browser**?

Once confirmed, I can:
- Keep current browser-based implementation, OR
- Research P550 alternative methods for playing audio through phone

---

**Current Status**: Waiting for clarification
**Date**: 2025-12-15
