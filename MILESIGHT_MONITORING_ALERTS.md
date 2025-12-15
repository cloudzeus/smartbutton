# Milesight Device Monitoring & Alerts - Complete System

## ✅ Full Implementation Summary

### 1. **Milesight Status Dashboard** (`/dashboard/milesight/status`)
Real-time monitoring dashboard showing:
- **Summary Cards**:
  - Total Devices
  - Online Devices (green)
  - Offline Devices (gray)
  - Low Battery Devices (red)
- **Alerts Section**:
  - Red alert for offline devices
  - Yellow alert for low battery devices
- **Device Grid**:
  - Card for each device showing:
    - Status icon (Online/Offline/Disconnected)
    - Battery level with icon
    - Assigned extension
    - Serial number
    - Last synced timestamp
- **Auto-refresh**: Every 30 seconds

### 2. **Device Alert Recipients** (in PBX Settings)
Configure who to call when device issues occur:
- **Drag & Drop Ordering**: Priority order for calls
- **Configurable Triggers**:
  - ✅ Notify on Offline
  - ✅ Notify on Low Battery (with custom threshold)
- **Recipient Types**:
  - Extension (internal)
  - External number
- **Battery Threshold**: Customizable (default: 20%)

### 3. **Database Schema**

```prisma
model DeviceAlertRecipient {
  id                  String        @id
  number              String        // Extension or external number
  label               String        // Display name
  type                RecipientType // EXTENSION or EXTERNAL
  order               Int           // Call priority
  isActive            Boolean
  
  // Alert triggers
  notifyOnOffline     Boolean       // Call when offline
  notifyOnLowBattery  Boolean       // Call when battery low
  batteryThreshold    Int           // Battery % threshold
  
  createdAt           DateTime
  updatedAt           DateTime
}
```

### 4. **Menu Structure**

**Milesight Settings** (Menu Group)
- 📱 Smart Buttons - Extensions (`/dashboard/milesight/smart-buttons`)
- 📊 Milesight Status (`/dashboard/milesight/status`)

**PBX Settings** (Menu Group)
- Alert Recipients (for button press alerts)
- Device Alert Recipients (for device issues)

### 5. **Alert Workflow**

#### When Device Goes Offline:
```
1. Device status changes to OFFLINE (detected during sync)
   ↓
2. System checks DeviceAlertRecipients
   ↓
3. Filters recipients where notifyOnOffline = true
   ↓
4. Calls recipients in order (by 'order' field)
   ↓
5. Waits for answer (30 sec timeout)
   ↓
6. If answered: Plays alert message → DONE
   ↓
7. If no answer: Calls next recipient
```

#### When Battery is Low:
```
1. Device battery < threshold (detected during sync)
   ↓
2. System checks DeviceAlertRecipients
   ↓
3. Filters recipients where notifyOnLowBattery = true
   ↓
4. Calls recipients in order
   ↓
5. Plays low battery alert message
```

### 6. **API Endpoints**

#### `/api/device-alert-recipients`
- **GET** - Fetch all device alert recipients
- **POST** - Add new recipient
- **PUT** - Update recipient or reorder
- **DELETE** - Remove recipient

#### `/api/milesight/devices`
- **GET** - Get all synced devices
- **POST** - Sync devices from Milesight platform
- **PUT** - Update device extension assignment

### 7. **Features**

#### Milesight Status Dashboard:
✅ Real-time device monitoring
✅ Visual status indicators
✅ Battery level display
✅ Offline/Low battery alerts
✅ Auto-refresh (30 seconds)
✅ Device grid with details
✅ Extension assignment display

#### Device Alert Recipients:
✅ Drag & drop ordering
✅ Extension/External number support
✅ Configurable alert triggers
✅ Custom battery threshold
✅ Add/Delete recipients
✅ Visual trigger indicators

#### Smart Buttons - Extensions:
✅ Sync devices from Milesight
✅ Search functionality
✅ Extension assignment dropdown
✅ Status indicators
✅ Battery display
✅ Device details table

### 8. **Usage Guide**

#### Setup Device Alert Recipients:
1. Go to **Dashboard → Settings → PBX**
2. Scroll to **"Device Alert Recipients"**
3. Click **"Add Recipient"**
4. Configure:
   - Type (Extension/External)
   - Number
   - Label (e.g., "IT Support")
   - Check "Notify on Offline"
   - Check "Notify on Low Battery"
   - Set battery threshold (e.g., 20%)
5. Click **"Add Recipient"**
6. Drag to reorder priority

#### Monitor Device Status:
1. Go to **Dashboard → Milesight Settings → Milesight Status**
2. View summary cards (Total, Online, Offline, Low Battery)
3. Check alerts section for issues
4. Review device grid for details
5. Click **"Refresh"** to update manually

#### Assign Devices to Extensions:
1. Go to **Dashboard → Milesight Settings → Smart Buttons - Extensions**
2. Click **"Sync Devices"** to fetch from Milesight
3. Use dropdown in each row to assign extension
4. Search devices by name, ID, serial, or model

### 9. **Alert Scenarios**

#### Scenario 1: Device Goes Offline
```
Device: "Room 101 Button" goes offline
↓
Alert Recipients (in order):
1. IT Support (Ext 200) - Called, no answer
2. Maintenance (6940123456) - Called, ANSWERED
↓
Alert Message Played: "Device Room 101 Button is offline"
```

#### Scenario 2: Low Battery
```
Device: "Room 202 Button" battery at 15%
↓
Alert Recipients (in order):
1. IT Support (Ext 200) - Called, ANSWERED
↓
Alert Message Played: "Device Room 202 Button has low battery (15%)"
```

#### Scenario 3: Multiple Issues
```
3 devices offline, 2 devices low battery
↓
Dashboard shows:
- Red alert: "3 device(s) offline: Room 101, Room 202, Room 303"
- Yellow alert: "2 device(s) with low battery: Room 104 (18%), Room 205 (12%)"
↓
Calls made for each issue in parallel
```

### 10. **Monitoring & Maintenance**

#### Daily Checks:
- Review Milesight Status dashboard
- Check for offline devices
- Monitor battery levels
- Verify extension assignments

#### Weekly Tasks:
- Sync devices from Milesight platform
- Review alert recipient list
- Test alert system

#### Monthly Tasks:
- Review device history
- Update battery thresholds if needed
- Clean up old/inactive devices

### 11. **Troubleshooting**

#### No alerts when device goes offline:
1. Check device alert recipients are configured
2. Verify `notifyOnOffline` is enabled
3. Check recipient numbers are correct
4. Review console logs for errors

#### Battery alerts not working:
1. Verify `notifyOnLowBattery` is enabled
2. Check battery threshold setting
3. Ensure device reports battery level
4. Sync devices to get latest data

#### Status dashboard not updating:
1. Click "Refresh" button
2. Check Milesight API credentials
3. Verify network connectivity
4. Check console for errors

### 12. **Integration Points**

#### With Button Press Alerts:
- Button pressed → Calls **Alert Recipients**
- Device offline → Calls **Device Alert Recipients**

#### With PBX System:
- Uses same call/dial API
- Uses same prompt playback
- Shares extension data

#### With Milesight Platform:
- Syncs device status
- Fetches battery levels
- Gets device attributes
- Monitors connectivity

### 13. **Database Queries**

#### Get all offline devices:
```sql
SELECT * FROM MilesightDevice 
WHERE JSON_EXTRACT(attributes, '$.connectStatus') = 'OFFLINE';
```

#### Get low battery devices:
```sql
SELECT * FROM MilesightDevice 
WHERE CAST(JSON_EXTRACT(attributes, '$.electricity') AS UNSIGNED) < 20;
```

#### Get device alert recipients:
```sql
SELECT * FROM DeviceAlertRecipient 
WHERE isActive = true 
ORDER BY `order` ASC;
```

### 14. **Future Enhancements**

🔮 **Planned Features:**
- Email notifications for device issues
- SMS alerts via Twilio
- Device health history charts
- Predictive battery replacement alerts
- Bulk device operations
- Custom alert messages per device
- Scheduled maintenance mode
- Device groups with group-specific alerts

---

**Status**: ✅ Fully Implemented  
**Date**: 2025-12-15  
**Components**: 3 pages, 2 API endpoints, 2 database models  
**Ready**: Production Ready  
**Auto-refresh**: 30 seconds  
**Alert Types**: Offline, Low Battery
