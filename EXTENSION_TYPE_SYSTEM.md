# Extension Type System - Room vs Admin Extensions

## ✅ Complete Implementation

### Overview
Extensions are now categorized into three types to properly manage hotel operations:
- **ROOM** - Hotel room extensions (need smart buttons)
- **ADMIN** - Administrative/staff extensions (don't need smart buttons)
- **OTHER** - Other types of extensions

### Database Schema

```prisma
model Extension {
  id            String   @id
  extensionId   String   @unique
  name          String?
  
  // Extension Type & Room Info
  extensionType ExtensionType @default(OTHER)
  roomNumber    String?  // Room number if type is ROOM
  
  // ... other fields
}

enum ExtensionType {
  ROOM   // Hotel room extension
  ADMIN  // Administrative/staff extension  
  OTHER  // Other type of extension
}
```

### Key Features

#### 1. **Extension Classification**
- Each extension can be marked as ROOM, ADMIN, or OTHER
- Room extensions can have a room number (e.g., "101", "205", "Suite A")
- Only ROOM extensions are checked for smart button assignment

#### 2. **Smart Button Assignment Logic**
- Only ROOM extensions need smart buttons
- ADMIN extensions (reception, manager, IT) don't need buttons
- Unassigned extension alerts only check ROOM type extensions

#### 3. **Email Alerts**
- Email alerts for unassigned extensions only include ROOM types
- Subject: "⚠️ X Room Extension(s) Without Smart Buttons"
- Helps focus on guest rooms that need emergency buttons

### Usage

#### Setting Extension Type via API:

```bash
# Update extension to ROOM type with room number
PUT /api/extensions/{id}
{
  "extensionType": "ROOM",
  "roomNumber": "101",
  "name": "Room 101"
}

# Update extension to ADMIN type
PUT /api/extensions/{id}
{
  "extensionType": "ADMIN",
  "name": "Reception Desk"
}
```

#### Querying Room Extensions:

```typescript
// Get all room extensions
const roomExtensions = await prisma.extension.findMany({
  where: { extensionType: 'ROOM' }
})

// Get unassigned room extensions
const unassignedRooms = await prisma.extension.findMany({
  where: {
    extensionType: 'ROOM',
    milesightDevices: { none: {} }
  }
})
```

### Example Hotel Setup

**Room Extensions (need smart buttons):**
- Extension 101 → Room 101
- Extension 102 → Room 102
- Extension 201 → Room 201 (Suite)
- Extension 202 → Room 202

**Admin Extensions (no smart buttons needed):**
- Extension 100 → Reception
- Extension 500 → Manager Office
- Extension 501 → IT Support
- Extension 502 → Maintenance

**Other Extensions:**
- Extension 999 → Conference Room
- Extension 888 → Restaurant

### Smart Button Assignment Flow

```
1. Sync extensions from PBX
   ↓
2. Admin marks room extensions as type "ROOM"
   ↓
3. Admin assigns room numbers
   ↓
4. Sync Milesight devices
   ↓
5. Assign smart buttons to ROOM extensions
   ↓
6. System checks only ROOM extensions for alerts
```

### Email Alert Example

**Before (all extensions):**
```
Subject: ⚠️ 15 Extension(s) Without Smart Buttons

Extensions without smart buttons:
• Extension 100 - Reception
• Extension 101 - Room 101
• Extension 500 - Manager
• Extension 501 - IT Support
... (11 more)
```

**After (only rooms):**
```
Subject: ⚠️ 5 Room Extension(s) Without Smart Buttons

Room extensions without smart buttons:
• Extension 101 - Room 101
• Extension 102 - Room 102
• Extension 201 - Room 201
• Extension 202 - Room 202
• Extension 305 - Suite 305
```

### Benefits

✅ **Focused Alerts** - Only alert for rooms that actually need buttons
✅ **Better Organization** - Clear distinction between room and admin extensions
✅ **Room Tracking** - Room numbers linked to extensions
✅ **Scalability** - Easy to manage hotels with many extensions
✅ **Flexibility** - Can add more types in the future (CONFERENCE, RESTAURANT, etc.)

### Best Practices

1. **Set Extension Types Early**
   - Mark extensions as ROOM or ADMIN when syncing from PBX
   - Add room numbers to all ROOM extensions

2. **Naming Convention**
   - ROOM: "Room 101", "Suite 205"
   - ADMIN: "Reception", "Manager Office", "IT Support"
   - OTHER: "Conference Room A", "Restaurant"

3. **Regular Audits**
   - Check that all ROOM extensions have smart buttons
   - Verify room numbers are correct
   - Update types as hotel layout changes

4. **Smart Button Assignment**
   - Assign buttons to ROOM extensions first
   - Use room number to match device to extension
   - Keep ADMIN extensions unassigned

### Future Enhancements

🔮 **Planned Features:**
- Bulk extension type update
- Import room list from CSV
- Auto-detect room extensions by number pattern
- Floor-based grouping
- Room status integration (occupied/vacant)
- Housekeeping integration

### Migration Guide

If you have existing extensions without types:

```sql
-- Mark all extensions with numbers 100-999 as ROOM
UPDATE Extension 
SET extensionType = 'ROOM', 
    roomNumber = extensionId 
WHERE CAST(extensionId AS UNSIGNED) BETWEEN 100 AND 999;

-- Mark specific extensions as ADMIN
UPDATE Extension 
SET extensionType = 'ADMIN' 
WHERE extensionId IN ('100', '500', '501', '502');
```

---

**Status**: ✅ Complete  
**Date**: 2025-12-15  
**Impact**: Only ROOM extensions checked for smart button assignment  
**Ready**: Production Ready
