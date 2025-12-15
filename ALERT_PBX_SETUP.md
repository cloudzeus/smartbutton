# Alert.mp3 Setup Guide for Yeastar P550

## Overview
The alert.mp3 file will now play **to the callee's phone speaker** when they answer a call.

## Important: Upload alert.mp3 to PBX

The P550 requires custom prompts to be uploaded through the **PBX web interface** before they can be played.

### Step 1: Access PBX Web Interface

1. Open browser and go to: `https://YOUR_PBX_IP:PORT`
2. Login with admin credentials

### Step 2: Navigate to Custom Prompts

1. Go to **Settings** → **PBX** → **Voice Prompts**
2. Or: **PBX** → **Call Features** → **Voice Prompts**
3. Look for **Custom Prompts** section

### Step 3: Upload alert.mp3

1. Click **Add** or **Upload** button
2. **Prompt Name**: Enter `alert` (exactly, without extension)
3. **Audio File**: Select `/public/alert.mp3` from your computer
4. **Format**: MP3 (or convert to WAV/GSM if required)
5. Click **Save** or **Upload**

### Step 4: Verify Upload

1. Check that "alert" appears in the custom prompts list
2. You should see: `alert.mp3` or `alert.wav`

## Audio File Requirements

### Recommended Format:
- **Format**: WAV (preferred) or MP3
- **Sample Rate**: 8kHz (telephony standard)
- **Bitrate**: 64kbps
- **Channels**: Mono
- **Codec**: PCM (for WAV) or MP3

### Convert if Needed:

```bash
# Convert to WAV 8kHz mono (best for PBX)
ffmpeg -i public/alert.mp3 -ar 8000 -ac 1 -codec:a pcm_s16le public/alert.wav

# Or convert to GSM (smaller file size)
ffmpeg -i public/alert.mp3 -ar 8000 -ac 1 -codec:a gsm public/alert.gsm
```

## How It Works

### Call Flow:
```
1. Extension A calls Extension B
   ↓
2. Extension B's phone rings
   ↓
3. Extension B picks up the phone
   ↓
4. Webhook receives Event 30011 (member_status: ANSWER)
   ↓
5. System calls /api/pbx/prompt/play
   ↓
6. PBX plays alert.mp3 to Extension B's phone speaker 🔊
   ↓
7. Extension B hears the alert
   ↓
8. Call continues normally
```

### Console Output:
```
📞 Extension 20 ANSWERED - Playing alert to callee
🔊 Alert prompt triggered for extension 20
✅ Prompt "alert" played successfully to extension 20
```

## Testing

### Test 1: Verify Prompt Upload
1. Login to PBX web interface
2. Go to Voice Prompts
3. Confirm "alert" is listed

### Test 2: Test Playback
1. Make a call between two extensions
2. Answer the call
3. **Callee should hear alert.mp3** through their phone speaker
4. Check server console for success logs

### Expected Behavior:
- ✅ Callee hears alert when they answer
- ✅ Alert plays through phone speaker (not browser)
- ✅ Alert plays once
- ✅ Call continues after alert

## Troubleshooting

### Issue 1: Prompt Not Found
**Error**: `PBX API Error 10001: Prompt not found`

**Solution**:
1. Verify prompt is uploaded to PBX
2. Check prompt name is exactly "alert" (case-sensitive)
3. Re-upload the file

### Issue 2: Wrong Format
**Error**: `Invalid audio format`

**Solution**:
1. Convert to WAV 8kHz mono:
   ```bash
   ffmpeg -i alert.mp3 -ar 8000 -ac 1 alert.wav
   ```
2. Upload WAV file instead

### Issue 3: No Sound
**Symptom**: No error but callee doesn't hear anything

**Check**:
1. Phone volume is not muted
2. Prompt file is not empty/corrupted
3. Try playing a different system prompt to test

### Issue 4: API Error
**Error**: `Failed to play alert to extension`

**Check Console**:
```
⚠️ Failed to play alert to 20: PBX API Error 10001
```

**Solution**:
1. Check PBX API is enabled
2. Verify access token is valid
3. Check prompt name matches uploaded file

## Alternative: Use System Prompts

If you can't upload custom prompts, you can use built-in system prompts:

### Common System Prompts:
- `welcome` - Welcome message
- `thank_you` - Thank you message
- `please_hold` - Please hold
- `transfer` - Transfer message

### Update Code:
```typescript
// In webhook handler, change:
promptName: 'alert'
// To:
promptName: 'welcome'  // or any system prompt
```

## API Endpoint Details

### Endpoint:
```
POST /openapi/v1.0/call/play_prompt
```

### Request Body:
```json
{
  "number": "20",           // Extension number
  "prompts": ["alert"],     // Prompt name(s)
  "count": 1,               // Play once
  "auto_answer": "no",      // Don't auto-answer
  "volume": 15              // Volume 0-20
}
```

### Response (Success):
```json
{
  "errcode": 0,
  "errmsg": "SUCCESS"
}
```

### Response (Error):
```json
{
  "errcode": 10001,
  "errmsg": "Prompt not found"
}
```

## Configuration Options

### Adjust Volume:
```typescript
// In webhook handler:
volume: 20  // Max volume (0-20)
```

### Play Multiple Times:
```typescript
count: 3  // Play 3 times
```

### Auto-Answer:
```typescript
auto_answer: 'yes'  // Phone auto-answers
```

## Security Note

The prompt is played to the **extension number**, not to a specific call. This means:
- ✅ Works even if call details are not available
- ✅ Simple and reliable
- ⚠️ If extension is on multiple calls, all hear it

## Next Steps

1. **Upload alert.mp3 to PBX** (see Step 2 above)
2. **Test the feature** by making a call
3. **Verify callee hears the alert**
4. **Check console logs** for success/errors

---

**Status**: Ready to test after uploading prompt to PBX  
**Date**: 2025-12-15  
**Requirement**: alert.mp3 must be uploaded to PBX web interface
