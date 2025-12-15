# Alert.mp3 Troubleshooting Guide

## Quick Checks

### 1. Verify File Exists
```bash
ls -la public/alert.mp3
# Should show: -rw-r--r--@ 1 user staff 93667 Dec 15 08:07 public/alert.mp3
```

### 2. Test File in Browser
Open in browser: `http://localhost:3000/alert.mp3`
- Should download or play the file
- If 404, file is not accessible

### 3. Check Browser Console
When call is answered, you should see:
```
🔊 Playing alert.mp3
📊 Call status changed to 'connected' - triggering audio
✅ alert.mp3 loaded and ready to play
✅ alert.mp3 play() promise resolved successfully
▶️ alert.mp3 is now playing
✅ alert.mp3 finished playing
```

## Common Issues

### Issue 1: Browser Autoplay Policy
**Symptom**: Error `NotAllowedError: play() failed because the user didn't interact with the document first`

**Solution**: 
- The code now shows an alert dialog when this happens
- Clicking "OK" will play the audio
- This is a browser security feature

**Workaround**: Click anywhere on the page before making a call

### Issue 2: Call Status Not Reaching 'connected'
**Symptom**: No console logs about playing alert.mp3

**Check**:
1. Open browser DevTools → Console
2. Make a call
3. Look for: `✅ Call ANSWERED - Closing modal, extensions now busy`
4. If you don't see this, the call status isn't updating

**Solution**: Check that:
- WebSocket is connected
- Polling is working (check for API calls to `/api/pbx/call/status`)
- Call ID is being tracked

### Issue 3: Audio File Not Loading
**Symptom**: Error loading audio file

**Check**:
1. Browser Network tab
2. Look for request to `/alert.mp3`
3. Should return 200 OK

**Solution**:
```bash
# Verify file permissions
chmod 644 public/alert.mp3

# Verify file is valid MP3
file public/alert.mp3
# Should show: public/alert.mp3: Audio file with ID3 version 2.4.0
```

### Issue 4: Volume Too Low
**Symptom**: Audio plays but can't hear it

**Check**:
- System volume
- Browser tab volume (right-click tab)
- Audio file volume

**Solution**: The code now sets `volume = 1.0` (100%)

### Issue 5: Wrong Audio Format
**Symptom**: Browser can't play the file

**Check**:
```bash
ffprobe public/alert.mp3
```

**Solution**: Convert to compatible format:
```bash
ffmpeg -i input.mp3 -codec:a libmp3lame -b:a 128k -ar 44100 public/alert.mp3
```

## Debugging Steps

### Step 1: Test Audio File Directly
```javascript
// Open browser console and run:
const audio = new Audio('/alert.mp3');
audio.play();
```

If this works, the file is fine and accessible.

### Step 2: Check Call Status Updates
```javascript
// In browser console, watch for status changes:
// You should see polling requests to /api/pbx/call/status
```

### Step 3: Verify hasPlayedAnnouncement Flag
The audio only plays once per call. If you're testing multiple times:
1. Refresh the page between tests
2. Or check that the flag is being reset

### Step 4: Check for JavaScript Errors
- Open DevTools → Console
- Look for any red errors
- Especially around the time the call is answered

## Enhanced Logging

The code now includes detailed logging:

```typescript
console.log("🔊 Playing alert.mp3");
console.log("📊 Call status changed to 'connected' - triggering audio");
console.log("✅ alert.mp3 loaded and ready to play");
console.log("✅ alert.mp3 play() promise resolved successfully");
console.log("▶️ alert.mp3 is now playing");
console.log("✅ alert.mp3 finished playing");
```

If you don't see these logs, the status isn't reaching 'connected'.

## Testing Procedure

1. **Open browser DevTools** (F12)
2. **Go to Console tab**
3. **Make a call** between two extensions
4. **Answer the call**
5. **Watch console** for:
   - `✅ Call ANSWERED - Closing modal`
   - `🔊 Playing alert.mp3`
   - `✅ alert.mp3 play() promise resolved`
   - `▶️ alert.mp3 is now playing`

## Expected Console Output

### Successful Playback:
```
✅ Call ANSWERED - Closing modal, extensions now busy
🔊 Playing alert.mp3
📊 Call status changed to 'connected' - triggering audio
✅ alert.mp3 loaded and ready to play
✅ alert.mp3 play() promise resolved successfully
▶️ alert.mp3 is now playing
✅ alert.mp3 finished playing
Announcement: Playing TTS for caller 100
```

### Autoplay Blocked:
```
✅ Call ANSWERED - Closing modal, extensions now busy
🔊 Playing alert.mp3
📊 Call status changed to 'connected' - triggering audio
❌ Alert playback failed: NotAllowedError
Error name: NotAllowedError
Error message: play() failed because the user didn't interact with the document first
⚠️ Autoplay blocked by browser. User interaction required.
[Alert dialog appears: "🔊 Call answered! Click OK to hear the alert."]
```

### Status Not Updating:
```
[No logs about playing alert.mp3]
[Only see polling logs]
```

## Quick Fixes

### Fix 1: Autoplay Blocked
**Click anywhere on the page before making a call**

### Fix 2: File Not Found
```bash
# Verify file exists
ls -la public/alert.mp3

# If missing, add a file
cp /path/to/your/alert.mp3 public/alert.mp3
```

### Fix 3: Status Not Updating
**Check WebSocket connection**:
- Look for: `✅ PBX WebSocket Connected!`
- If not connected, restart the server

### Fix 4: Audio Already Played
**Refresh the page** - The audio only plays once per call session

## Browser Compatibility

### Tested Browsers:
- ✅ Chrome/Edge (Chromium) - Works
- ✅ Firefox - Works
- ✅ Safari - May require user interaction
- ⚠️ Mobile browsers - Autoplay usually blocked

### Autoplay Policies:
- **Chrome**: Allows autoplay after user interaction
- **Firefox**: Similar to Chrome
- **Safari**: Stricter, may always require interaction
- **Mobile**: Usually blocks all autoplay

## Alternative Solutions

### If Autoplay Continues to Fail:

#### Option 1: Preload Audio on Page Load
```typescript
useEffect(() => {
    const audio = new Audio('/alert.mp3');
    audio.load();
}, []);
```

#### Option 2: Play on User Interaction
```typescript
// Play when user clicks "Call" button
const handleCallSubmit = async () => {
    // Preload audio
    const alertAudio = new Audio('/alert.mp3');
    await alertAudio.load();
    
    // Continue with call...
};
```

#### Option 3: Use Audio Context API
```typescript
const audioContext = new AudioContext();
// More complex but better control
```

## Contact Support

If none of these solutions work:
1. Share browser console logs
2. Share Network tab (filter: alert.mp3)
3. Share browser version
4. Share OS version

---

**Last Updated**: 2025-12-15
**Status**: Enhanced with detailed logging
