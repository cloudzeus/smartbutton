# Milesight Smart Buttons - Extension Assignment System

## ✅ Complete Implementation

### 1. Database Model
- **MilesightDevice** table created with:
  - Device details (ID, name, model, serial number)
  - Full device attributes stored as JSON
  - Extension assignment (foreign key to Extension)
  - Sync tracking (lastSyncedAt, isActive)

### 2. Milesight API Client (`/src/lib/milesight-api.ts`)
Enhanced with proper Milesight platform endpoints:
- `getMilesightDevices()` - Fetch all devices with pagination
- `getMilesightDevice(deviceId)` - Get specific device details
- `getDeviceConfig(deviceId)` - Get device configuration
- `getDeviceTSL(deviceId)` - Get Thing Specification Language model
- `getDeviceHistory(deviceId)` - Get historical properties data

### 3. API Endpoints (`/api/milesight/devices`)
- **POST** - Sync devices from Milesight platform
  - Fetches all devices with pagination
  - Stores/updates in local database
  - Returns sync statistics

- **GET** - Get all synced devices
  - Includes assigned extension details
  - Ordered by device name

- **PUT** - Update extension assignment
  - Assign/unassign extension to device
  - Returns updated device

### 4. UI Page (`/dashboard/milesight/smart-buttons`)
Features:
- ✅ Data table with all device details
- ✅ Search functionality (name, ID, serial, model)
- ✅ Status indicators (Online/Offline/Disconnected)
- ✅ Battery level display
- ✅ Extension assignment dropdown with search
- ✅ Sync button to fetch latest from Milesight
- ✅ Last synced timestamp

### 5. Menu System
- **Menu Group**: "Milesight Settings" (Smartphone icon)
- **Menu Item**: "Smart Buttons - Extensions"
- **Path**: `/dashboard/milesight/smart-buttons`
- **Permissions**: 
  - ADMIN: Full access
  - MANAGER: View, Create, Edit
  - EMPLOYEE: View only

## How It Works

### Initial Setup:
1. Configure Milesight credentials in `.env`:
   ```
   MILESIGHT_SERVER_ADDRESS=https://eu-openapi.milesight.com
   MILESIGHT_CLIENT_ID=your-client-id
   MILESIGHT_CLIENT_SECRET=your-secret
   ```

2. Navigate to: **Dashboard → Milesight Settings → Smart Buttons - Extensions**

3. Click **"Sync Devices"** to fetch all devices from Milesight platform

### Device Sync Process:
```
1. User clicks "Sync Devices"
   ↓
2. System authenticates with Milesight (OAuth)
   ↓
3. Fetches all devices via GET /device-openapi/v1/devices
   ↓
4. Handles pagination automatically
   ↓
5. Stores/updates each device in local database
   ↓
6. Shows sync statistics (created/updated)
```

### Extension Assignment:
```
1. User selects extension from dropdown
   ↓
2. System updates MilesightDevice.assignedExtensionId
   ↓
3. Device is now linked to extension
   ↓
4. When button is pressed, webhook triggers calls to assigned extension
```

## Device Data Stored

For each device, we store:

### Basic Info:
- `deviceId` - Unique Milesight device ID
- `deviceName` - Friendly name
- `deviceModel` - Model (e.g., WS101)
- `serialNumber` - Serial number

### Full Attributes (JSON):
```json
{
  "deviceId": "...",
  "sn": "...",
  "devEUI": "...",
  "model": "WS101",
  "deviceType": "SUB_DEVICE",
  "licenseStatus": "VALID",
  "connectStatus": "ONLINE",
  "electricity": 85,
  "lastUpdateTime": "2025-12-15T10:00:00Z",
  "name": "Room 101 Button",
  "description": "Emergency button",
  "project": "Hotel Floor 1",
  "tag": ["emergency", "room-101"],
  "application": {
    "applicationId": "...",
    "applicationName": "Hotel Alerts"
  },
  "firmwareVersion": "1.0.0"
}
```

### Assignment:
- `assignedExtensionId` - FK to Extension table
- `assignedExtension` - Populated extension details

### Sync Info:
- `lastSyncedAt` - When device was last synced
- `isActive` - Based on connectStatus

## UI Features

### Data Table Columns:
1. **Status** - Online/Offline indicator with icon
2. **Device Name** - Friendly name from Milesight
3. **Model** - Device model badge
4. **Serial Number** - Monospace font
5. **Battery** - Battery icon + percentage
6. **Assigned Extension** - Searchable dropdown
7. **Last Synced** - Timestamp

### Search:
- Searches across: name, deviceId, serialNumber, model
- Real-time filtering
- Case-insensitive

### Extension Dropdown:
- Shows all available extensions
- Format: "Extension 100 - Reception"
- Includes "No assignment" option
- Instant update on change

## Integration with Alert System

When a button is pressed:

```
1. Milesight sends webhook to /api/milesight/webhook
   ↓
2. Webhook extracts deviceId from payload
   ↓
3. Looks up MilesightDevice by deviceId
   ↓
4. Gets assignedExtensionId
   ↓
5. Triggers alert sequence for that extension
   ↓
6. Calls alert recipients in order
   ↓
7. Plays alert.mp3 when answered
```

## API Examples

### Sync Devices:
```bash
POST /api/milesight/devices
Response:
{
  "success": true,
  "message": "Devices synced successfully",
  "stats": {
    "total": 15,
    "created": 3,
    "updated": 12
  }
}
```

### Get Devices:
```bash
GET /api/milesight/devices
Response:
{
  "success": true,
  "devices": [
    {
      "id": "...",
      "deviceId": "...",
      "deviceName": "Room 101 Button",
      "deviceModel": "WS101",
      "serialNumber": "...",
      "assignedExtension": {
        "id": "...",
        "extensionId": "100",
        "name": "Reception"
      },
      ...
    }
  ]
}
```

### Assign Extension:
```bash
PUT /api/milesight/devices
Body:
{
  "deviceId": "device-123",
  "assignedExtensionId": "ext-id-456"
}
Response:
{
  "success": true,
  "device": { ... }
}
```

## Troubleshooting

### No devices showing:
1. Check Milesight credentials in `.env`
2. Click "Sync Devices"
3. Check console for errors

### Sync fails:
1. Verify `MILESIGHT_SERVER_ADDRESS` is correct
2. Verify `MILESIGHT_CLIENT_ID` and `MILESIGHT_CLIENT_SECRET`
3. Check network connectivity to Milesight platform
4. Check console logs for detailed error

### Extension assignment not working:
1. Ensure extensions are synced from PBX
2. Check database for Extension records
3. Verify extension ID is correct

## Database Schema

```prisma
model MilesightDevice {
  id                  String     @id @default(cuid())
  deviceId            String     @unique
  deviceName          String
  deviceType          String?
  deviceModel         String?
  serialNumber        String?
  attributes          Json?
  assignedExtensionId String?
  assignedExtension   Extension? @relation(fields: [assignedExtensionId], references: [id])
  lastSyncedAt        DateTime   @default(now())
  isActive            Boolean    @default(true)
  createdAt           DateTime   @default(now())
  updatedAt           DateTime   @updatedAt
}
```

## Future Enhancements

🔮 **Planned Features:**
- Bulk extension assignment
- Device groups
- Custom alert rules per device
- Device activity history
- Real-time status updates via WebSocket
- Device configuration from UI
- TSL property display
- Historical data charts

---

**Status**: ✅ Fully Implemented  
**Date**: 2025-12-15  
**Ready**: Production Ready
