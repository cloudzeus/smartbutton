# Email Alert System - Unassigned Extensions & Device Issues

## ✅ Complete Implementation

### Overview
Automated email notification system using Resend API to alert administrators when:
- Extensions don't have assigned smart buttons
- Devices go offline
- Devices have low battery

### Components

#### 1. **Email Service** (`/src/lib/email-service.ts`)
Professional HTML email templates using Resend API:
- `sendUnassignedExtensionsAlert()` - Alerts for extensions without buttons
- `sendOfflineDevicesAlert()` - Alerts for offline devices
- Beautiful, responsive email design
- Action buttons linking to dashboard

#### 2. **API Endpoint** (`/api/alerts/unassigned-extensions`)
- **GET** - Check unassigned extensions (optional email)
- **POST** - Send comprehensive alert email

#### 3. **UI Integration** (Milesight Status Dashboard)
- Email input field
- "Send Alerts" button
- Real-time feedback

### Configuration

**Environment Variable:**
```env
RESEND_API_KEY=re_JgwDDqFq_4Maw3HpRXyNDXKCq1XTNkKgF
```

**From Address:**
```
Smart Button Alerts <alerts@yourdomain.com>
```
*Note: Update this in `/src/lib/email-service.ts` to match your verified domain*

### Usage

#### Manual Alert (via UI):
1. Go to **Dashboard → Milesight Settings → Milesight Status**
2. Scroll to **"Email Alerts"** card
3. Enter recipient email (e.g., `admin@hotel.com`)
4. Click **"Send Alerts"**
5. Receive email with:
   - Unassigned extensions list
   - Offline devices list
   - Low battery devices list

#### Programmatic Alert (via API):
```bash
# Check only (no email)
GET /api/alerts/unassigned-extensions

# Check and send email
GET /api/alerts/unassigned-extensions?email=admin@hotel.com&sendEmail=true

# Send comprehensive alert
POST /api/alerts/unassigned-extensions
Content-Type: application/json

{
  "recipientEmail": "admin@hotel.com",
  "checkUnassigned": true,
  "checkOffline": true
}
```

### Email Content

#### Unassigned Extensions Alert

**Subject:** `⚠️ X Extension(s) Without Smart Buttons`

**Content:**
- Header with alert icon
- Warning box
- List of unassigned extensions
- "Why this matters" explanation
- "Assign Smart Buttons Now" button
- Step-by-step instructions
- Timestamp

**Example:**
```
⚠️ Unassigned Extensions Alert

The following extensions do not have smart buttons assigned:

• Extension 101 - Room 101
• Extension 102 - Room 102
• Extension 205 - Suite 205

Why this matters:
Guests in these rooms will not be able to use the smart button emergency alert system.

[Assign Smart Buttons Now]

Next Steps:
1. Go to Dashboard → Milesight Settings → Smart Buttons - Extensions
2. Find the unassigned extensions
3. Use the dropdown to assign devices
4. Verify the assignment
```

#### Offline Devices Alert

**Subject:** `🔴 X Smart Button Device(s) Offline`

**Content:**
- Critical alert header
- List of offline devices
- Action required message
- Timestamp

### Automated Scheduling (Optional)

You can set up automated daily/weekly checks using:

#### Option 1: Cron Job (Server)
```bash
# Daily at 9 AM
0 9 * * * curl -X POST https://your-domain.com/api/alerts/unassigned-extensions \
  -H "Content-Type: application/json" \
  -d '{"recipientEmail":"admin@hotel.com","checkUnassigned":true,"checkOffline":true}'
```

#### Option 2: Next.js API Route (Scheduled)
Create `/api/cron/daily-alerts/route.ts`:
```typescript
export async function GET() {
    // Check and send alerts
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/alerts/unassigned-extensions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            recipientEmail: process.env.ADMIN_EMAIL,
            checkUnassigned: true,
            checkOffline: true
        })
    });
    
    return Response.json({ success: true });
}
```

Then configure Coolify/Vercel cron to hit this endpoint daily.

### Response Format

#### GET Response:
```json
{
  "success": true,
  "stats": {
    "totalExtensions": 50,
    "assignedExtensions": 45,
    "unassignedExtensions": 5
  },
  "unassignedExtensions": [
    {
      "extensionId": "101",
      "name": "Room 101"
    }
  ],
  "emailSent": true
}
```

#### POST Response:
```json
{
  "success": true,
  "results": {
    "unassignedExtensions": {
      "count": 5,
      "extensions": [...]
    },
    "offlineDevices": {
      "count": 2,
      "devices": [...]
    },
    "emailsSent": ["unassigned_extensions", "offline_devices"]
  },
  "message": "Sent 2 alert email(s)"
}
```

### Email Design Features

✅ **Responsive Design** - Works on all devices
✅ **Professional Styling** - Gradient headers, clean layout
✅ **Action Buttons** - Direct links to dashboard
✅ **Color-Coded Alerts** - Yellow for warnings, Red for critical
✅ **Detailed Lists** - All affected items clearly listed
✅ **Helpful Instructions** - Step-by-step guidance
✅ **Timestamps** - When alert was generated

### Testing

#### Test Email Sending:
```bash
# Test unassigned extensions alert
curl -X POST http://localhost:3000/api/alerts/unassigned-extensions \
  -H "Content-Type: application/json" \
  -d '{
    "recipientEmail": "test@example.com",
    "checkUnassigned": true,
    "checkOffline": false
  }'
```

#### Expected Behavior:
1. API checks database for unassigned extensions
2. If found, generates HTML email
3. Sends via Resend API
4. Returns success with count
5. Email arrives within seconds

### Troubleshooting

#### Email not sending:
1. Check `RESEND_API_KEY` in `.env`
2. Verify Resend API key is valid
3. Check console logs for errors
4. Verify "from" email domain is verified in Resend

#### Email goes to spam:
1. Verify domain in Resend dashboard
2. Add SPF/DKIM records to DNS
3. Use verified domain for "from" address

#### Wrong data in email:
1. Check database has latest device sync
2. Verify extension-device assignments
3. Run sync before sending alert

### Resend Dashboard

Monitor emails at: https://resend.com/emails

- View sent emails
- Check delivery status
- See open/click rates
- Review bounces/complaints

### Best Practices

✅ **Daily Checks** - Send alert once per day (morning)
✅ **Multiple Recipients** - Send to IT, Management, Front Desk
✅ **Test Regularly** - Verify system works
✅ **Update Promptly** - Assign devices when alerted
✅ **Monitor Resend** - Check delivery rates

### Future Enhancements

🔮 **Planned Features:**
- SMS alerts via Twilio
- Slack/Teams integration
- Custom alert schedules
- Alert history log
- Digest emails (weekly summary)
- Alert acknowledgment system
- Escalation rules

### Cost Considerations

**Resend Pricing:**
- Free tier: 100 emails/day
- Pro: $20/month for 50,000 emails
- Enterprise: Custom pricing

**Recommended:**
- Start with free tier
- Monitor usage
- Upgrade if needed

---

**Status**: ✅ Fully Implemented  
**Date**: 2025-12-15  
**Email Provider**: Resend  
**API Key**: Configured  
**Ready**: Production Ready
