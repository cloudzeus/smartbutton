# Smart Button Alert System - Implementation Plan

## Overview
Hotel smart button integration that triggers automated calls with MP3 announcements when buttons are pressed.

## Architecture

### 1. Database Model ✅ COMPLETE

**AlertRecipient Model:**
```prisma
model AlertRecipient {
  id          String        @id @default(cuid())
  number      String        // Extension or external number
  label       String        // Display name
  type        RecipientType // EXTENSION or EXTERNAL
  order       Int           // Drag & drop ordering
  isActive    Boolean
  createdAt   DateTime
  updatedAt   DateTime
}

enum RecipientType {
  EXTENSION  // Internal PBX extension
  EXTERNAL   // External phone number
}
```

### 2. PBX Settings UI ✅ COMPLETE

**Location:** `/dashboard/settings/pbx`

**Features:**
- ✅ Add recipients (extensions or external numbers)
- ✅ Drag & drop to reorder call priority
- ✅ Delete recipients
- ✅ Visual indicators (Extension vs External)
- ✅ Order numbering (#1, #2, #3...)

**Component:** `AlertRecipientsCard`
- Drag & drop with HTML5 Drag API
- Real-time reordering
- Add dialog with type selection
- Delete confirmation

### 3. API Endpoints ✅ COMPLETE

**`/api/alert-recipients`**

- **GET** - Fetch all recipients (ordered)
- **POST** - Add new recipient
- **PUT** - Update recipient or reorder list
- **DELETE** - Remove recipient

## Next Steps

### 4. Milesight WebSocket Server ⏳ TODO

**Purpose:** Receive push messages from Milesight smart buttons

**Implementation:**
```typescript
// /src/lib/milesight-websocket.ts
- WebSocket server to receive button press events
- Parse Milesight message format
- Trigger alert call sequence
```

**Message Format (Expected):**
```json
{
  "deviceId": "button-room-101",
  "event": "button_press",
  "timestamp": "2025-12-15T09:00:00Z",
  "room": "101",
  "buttonType": "emergency"
}
```

### 5. Alert Call Trigger ⏳ TODO

**Purpose:** Call recipients in order and play MP3 announcement

**Flow:**
```
1. Receive button press from Milesight
   ↓
2. Fetch alert recipients (ordered)
   ↓
3. For each recipient (in order):
   a. Call the number (extension or external)
   b. Wait for answer
   c. Play alert.mp3 via PBX
   d. If no answer, try next recipient
   ↓
4. Log all call attempts
   ↓
5. Send notification to dashboard
```

**Implementation:**
```typescript
// /src/app/api/alert/trigger/route.ts
POST /api/alert/trigger
{
  "deviceId": "button-room-101",
  "room": "101",
  "message": "Emergency in Room 101"
}
```

### 6. Call Sequence Logic ⏳ TODO

**Sequential Calling:**
```typescript
async function triggerAlertSequence(deviceId: string, room: string) {
  const recipients = await prisma.alertRecipient.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' }
  });

  for (const recipient of recipients) {
    const success = await callAndPlayAlert(recipient, room);
    if (success) {
      console.log(`Alert answered by ${recipient.label}`);
      break; // Stop calling once someone answers
    }
  }
}
```

**Call & Play Alert:**
```typescript
async function callAndPlayAlert(recipient: AlertRecipient, room: string) {
  // 1. Initiate call
  const callResponse = await fetch('/api/pbx/call/dial', {
    method: 'POST',
    body: JSON.stringify({
      caller: '100', // System extension
      callee: recipient.number,
      auto_answer: recipient.type === 'EXTENSION' ? 'yes' : 'no'
    })
  });

  // 2. Wait for answer (poll call status)
  const answered = await waitForAnswer(callId, 30000); // 30 sec timeout

  if (answered) {
    // 3. Play alert.mp3
    await fetch('/api/pbx/prompt/play', {
      method: 'POST',
      body: JSON.stringify({
        extension: recipient.number,
        promptName: 'alert',
        volume: 20
      })
    });

    return true; // Success
  }

  return false; // No answer, try next
}
```

### 7. Milesight Integration ⏳ TODO

**Milesight Developer Platform:**
- Register application
- Get API credentials
- Configure webhook URL
- Set up push notifications

**Webhook Endpoint:**
```typescript
// /src/app/api/milesight/webhook/route.ts
POST /api/milesight/webhook
- Verify signature
- Parse button press event
- Trigger alert sequence
```

### 8. Dashboard Notifications ⏳ TODO

**Real-time Alerts:**
- Show active alerts on dashboard
- Display which recipient answered
- Log all call attempts
- Show alert history

**UI Components:**
- Alert notification banner
- Active alerts list
- Alert history table

## Configuration

### PBX Settings Required:

1. **Upload alert.mp3 to PBX**
   - Go to PBX → Voice Prompts
   - Upload alert.mp3
   - Name it "alert"

2. **Configure Alert Recipients**
   - Go to Dashboard → Settings → PBX
   - Scroll to "Alert Recipients"
   - Add recipients in priority order
   - Drag to reorder

3. **System Extension**
   - Create extension for system calls (e.g., 100)
   - Configure auto-answer if needed

### Milesight Settings Required:

1. **Device Registration**
   - Register smart buttons
   - Assign room numbers
   - Configure button types

2. **Webhook Configuration**
   - Set webhook URL: `https://your-domain.com/api/milesight/webhook`
   - Configure authentication
   - Test button press

## Testing Plan

### Phase 1: Manual Testing ✅
- Add/delete recipients via UI
- Drag & drop reordering
- Verify database updates

### Phase 2: Call Testing ⏳
- Trigger alert manually
- Verify call sequence
- Test MP3 playback
- Test timeout handling

### Phase 3: Integration Testing ⏳
- Connect Milesight button
- Test button press → call flow
- Verify notifications
- Test multiple buttons

### Phase 4: Production Testing ⏳
- Real hotel environment
- Multiple simultaneous alerts
- Network reliability
- Response time monitoring

## Security Considerations

✅ **Webhook Signature Verification**
- Verify Milesight webhook signatures
- Prevent unauthorized triggers

✅ **Rate Limiting**
- Prevent button spam
- Max 1 alert per device per minute

✅ **Access Control**
- Only admins can configure recipients
- Audit log for all changes

✅ **Call Logging**
- Log all alert calls
- Track response times
- Monitor success rates

## Monitoring & Alerts

**Metrics to Track:**
- Alert trigger count
- Average response time
- Success rate (% answered)
- Failed call attempts
- Most responsive recipients

**Alerts to Configure:**
- No answer after all recipients
- System extension offline
- PBX connection lost
- High alert frequency

## Documentation

### For Hotel Staff:
- How to use smart buttons
- What happens when pressed
- Expected response time
- Escalation procedures

### For Administrators:
- How to add/remove recipients
- How to reorder priority
- How to test the system
- Troubleshooting guide

## Cost Considerations

**PBX Costs:**
- External call charges (if using external numbers)
- Trunk capacity requirements

**Milesight Costs:**
- Device licenses
- Platform subscription
- API usage fees

## Future Enhancements

🔮 **Planned Features:**
- Multiple alert types (emergency, maintenance, housekeeping)
- Room-specific recipient lists
- Time-based routing (day/night shifts)
- SMS fallback if no answer
- Mobile app notifications
- Voice message recording
- Multi-language announcements

---

**Status:** Phase 1 Complete (UI & Database)  
**Next:** Implement Milesight WebSocket server  
**Timeline:** TBD  
**Priority:** High
