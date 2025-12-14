// Yeastar PBX Event Documentation
// Based on Yeastar P-Series Developer Guide

export interface PBXEventDefinition {
    eventType: string;
    category: string;
    description: string;
    severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    fields?: string[];
}

export const YEASTAR_EVENTS: Record<string, PBXEventDefinition> = {
    // Call Events
    'NewCdr': {
        eventType: 'NewCdr',
        category: 'CALL',
        description: 'A new call has been initiated in the system',
        severity: 'INFO',
        fields: ['callid', 'caller', 'callee', 'trunk', 'direction']
    },
    '30011': {
        eventType: 'CallStatus',
        category: 'CALL',
        description: 'Call State Changed',
        severity: 'INFO',
        fields: ['callid', 'extension', 'status']
    },
    '30012': {
        eventType: 'NewCdr',
        category: 'CALL',
        description: 'Call End Details (CDR)',
        severity: 'INFO',
        fields: ['callid', 'caller', 'callee', 'duration']
    },
    '30016': {
        eventType: 'IncomingCall',
        category: 'CALL',
        description: 'Incoming Call Request',
        severity: 'INFO',
        fields: ['callid', 'caller', 'callee']
    },
    '30015': {
        eventType: 'CallFailed',
        category: 'CALL',
        description: 'Call Failed',
        severity: 'ERROR',
        fields: ['callid', 'reason']
    },
    '30020': {
        eventType: 'CallOver',
        category: 'CALL',
        description: 'Call Session Ended',
        severity: 'INFO',
        fields: ['callid', 'extension']
    },

    // Extension Events
    '30007': {
        eventType: 'ExtensionRegistration',
        category: 'EXTENSION',
        description: 'Registration Status Changed',
        severity: 'INFO',
        fields: ['extension', 'status']
    },
    '30008': {
        eventType: 'ExtensionCallState',
        category: 'EXTENSION',
        description: 'Extension Status Update',
        severity: 'INFO',
        fields: ['extension', 'state']
    },
    '30009': {
        eventType: 'ExtensionPresence',
        category: 'EXTENSION',
        description: 'Extension Presence State Changed',
        severity: 'INFO',
        fields: ['extension', 'presence']
    },
    '30022': {
        eventType: 'ExtensionUpdate',
        category: 'EXTENSION',
        description: 'Extension Information Updated',
        severity: 'INFO',
        fields: ['extension']
    },

    // Legacy support (keep existing string keys if they are used elsewhere)
    'Invite': {
        eventType: 'Invite',
        category: 'CALL',
        description: 'SIP INVITE received - incoming call attempt',
        severity: 'INFO',
        fields: ['callid', 'from', 'to', 'extension']
    },
    'Ringing': {
        eventType: 'Ringing',
        category: 'CALL',
        description: 'Phone is ringing - call in progress',
        severity: 'INFO',
        fields: ['callid', 'extension']
    },
    'Answered': {
        eventType: 'Answered',
        category: 'CALL',
        description: 'Call has been answered',
        severity: 'SUCCESS',
        fields: ['callid', 'extension', 'answertime']
    },
    'Hangup': {
        eventType: 'Hangup',
        category: 'CALL',
        description: 'Call has ended',
        severity: 'INFO',
        fields: ['callid', 'cause', 'duration']
    },

    // Other System Events
    '30010': {
        eventType: 'TrunkStatus',
        category: 'TRUNK',
        description: 'Trunk Registration State Changed',
        severity: 'WARNING',
        fields: ['trunk', 'status']
    },
    '30033': {
        eventType: 'Recording',
        category: 'SYSTEM',
        description: 'Recording Download Completed',
        severity: 'SUCCESS',
        fields: ['filename']
    },
    '30028': {
        eventType: 'CallNoteStatus',
        category: 'CALL',
        description: 'Call note status has been updated',
        severity: 'INFO',
        fields: ['call_note_id', 'group_id', 'ext_num']
    },

    'Heartbeat': {
        eventType: 'Heartbeat',
        category: 'SYSTEM',
        description: 'Connection Keep-Alive',
        severity: 'INFO',
        fields: ['timestamp']
    }
};

export function getEventDefinition(eventType: string): PBXEventDefinition {
    return YEASTAR_EVENTS[eventType] || {
        eventType,
        category: 'UNKNOWN',
        description: `Unknown event type: ${eventType}`,
        severity: 'INFO',
    };
}

export function categorizeEvent(event: any): { type: string; category: string; severity: string; description: string } {
    const eventType = event.event || event.type || 'Unknown';
    const definition = getEventDefinition(eventType);

    return {
        type: eventType,
        category: definition.category,
        severity: definition.severity,
        description: definition.description,
    };
}
