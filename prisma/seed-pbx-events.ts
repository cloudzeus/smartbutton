import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const yeastarEventTypes = [
    // Call Events (30000-30019)
    {
        eventId: '30001',
        eventName: 'NewCdr',
        category: 'CALL',
        description: 'Triggered when a call ends. Sends a Call Detail Record (CDR) report in real-time.',
        severity: 'INFO',
        fields: ['callid', 'caller', 'callee', 'duration', 'disposition', 'trunk']
    },
    {
        eventId: '30002',
        eventName: 'CallStatus',
        category: 'CALL',
        description: 'Provides real-time status information for all calls.',
        severity: 'INFO',
        fields: ['callid', 'status', 'caller', 'callee']
    },
    {
        eventId: null,
        eventName: 'Invite',
        category: 'CALL',
        description: 'Sent when an inbound call is received. Application has 10 seconds to decide whether to answer.',
        severity: 'INFO',
        fields: ['callid', 'from', 'to', 'trunk']
    },
    {
        eventId: null,
        eventName: 'Incoming',
        category: 'CALL',
        description: 'Sent when an inbound call is accepted. Application has 10 seconds to control the destination.',
        severity: 'INFO',
        fields: ['callid', 'from', 'to']
    },
    {
        eventId: null,
        eventName: 'CallTransfer',
        category: 'CALL',
        description: 'Event triggered when a call is transferred.',
        severity: 'INFO',
        fields: ['callid', 'transferor', 'transferee', 'destination']
    },
    {
        eventId: null,
        eventName: 'CallForward',
        category: 'CALL',
        description: 'Triggered when call forwarding is enabled and an incoming call is forwarded.',
        severity: 'INFO',
        fields: ['callid', 'extension', 'forwardto']
    },
    {
        eventId: null,
        eventName: 'CallFailed',
        category: 'CALL',
        description: 'Event for failed calls.',
        severity: 'ERROR',
        fields: ['callid', 'reason', 'cause']
    },
    {
        eventId: '30016',
        eventName: 'InboundCallFromMonitoredTrunk',
        category: 'CALL',
        description: 'Occurs when an inbound call comes from a monitored trunk, allowing the application to control the call.',
        severity: 'INFO',
        fields: ['callid', 'trunk', 'caller', 'callee']
    },

    // Extension Events (30007-30009)
    {
        eventId: '30007',
        eventName: 'ExtensionRegistrationStatusChange',
        category: 'EXTENSION',
        description: 'Reports changes in an extension\'s registration status on SIP endpoints and Linkus UC Clients.',
        severity: 'INFO',
        fields: ['extension', 'registered', 'ip', 'useragent']
    },
    {
        eventId: '30008',
        eventName: 'ExtensionCallStateChanged',
        category: 'EXTENSION',
        description: 'Reports when the extension call status changes.',
        severity: 'INFO',
        fields: ['extension', 'status', 'callid']
    },
    {
        eventId: '30009',
        eventName: 'ExtensionPresenceStatusChanged',
        category: 'EXTENSION',
        description: 'Reports when the extension presence status changes.',
        severity: 'INFO',
        fields: ['extension', 'presence']
    },
    {
        eventId: null,
        eventName: 'ExtensionStatus',
        category: 'EXTENSION',
        description: 'Reports changes in an extension\'s status. States include Ringing, Busy, and Registered.',
        severity: 'INFO',
        fields: ['extension', 'status']
    },

    // Trunk Events (30010)
    {
        eventId: '30010',
        eventName: 'TrunkRegistrationStatusChanged',
        category: 'TRUNK',
        description: 'Reports when the trunk registration status changes.',
        severity: 'WARNING',
        fields: ['trunk', 'registered', 'status']
    },

    // System Events
    {
        eventId: null,
        eventName: 'BootUp',
        category: 'SYSTEM',
        description: 'System boot-up event.',
        severity: 'SUCCESS',
        fields: ['timestamp', 'version']
    },
    {
        eventId: null,
        eventName: 'ConfigChange',
        category: 'SYSTEM',
        description: 'Configuration change event.',
        severity: 'INFO',
        fields: ['module', 'change']
    },

    // Conference Events
    {
        eventId: null,
        eventName: 'ConferenceStatus',
        category: 'CONFERENCE',
        description: 'Event related to changes in conference members.',
        severity: 'INFO',
        fields: ['conferenceid', 'members', 'action']
    },

    // Queue Events
    {
        eventId: null,
        eventName: 'QueueAgentRingNoAnswerTimeout',
        category: 'QUEUE',
        description: 'Queue agent ring timeout event.',
        severity: 'WARNING',
        fields: ['queue', 'agent', 'timeout']
    },
    {
        eventId: null,
        eventName: 'QueueAutoPause',
        category: 'QUEUE',
        description: 'Queue agent auto pause event.',
        severity: 'INFO',
        fields: ['queue', 'agent', 'reason']
    },

    // Other Events
    {
        eventId: null,
        eventName: 'DTMF',
        category: 'CALL',
        description: 'DTMF (Dual-Tone Multi-Frequency) event.',
        severity: 'INFO',
        fields: ['callid', 'digit']
    },
    {
        eventId: null,
        eventName: 'PlayPromptEnd',
        category: 'SYSTEM',
        description: 'Event indicating the end of a prompt play.',
        severity: 'INFO',
        fields: ['callid', 'prompt']
    },
    {
        eventId: null,
        eventName: 'satisfaction',
        category: 'CALL',
        description: 'Satisfaction survey event.',
        severity: 'INFO',
        fields: ['callid', 'rating', 'feedback']
    },
    {
        eventId: '30033',
        eventName: 'RecordingDownloadCompleted',
        category: 'SYSTEM',
        description: 'Triggered when a recording file is successfully downloaded via the API in asynchronous mode.',
        severity: 'SUCCESS',
        fields: ['recordingid', 'filename', 'url']
    },

    // Additional common events
    {
        eventId: null,
        eventName: 'Ringing',
        category: 'CALL',
        description: 'Phone is ringing - call in progress.',
        severity: 'INFO',
        fields: ['callid', 'extension']
    },
    {
        eventId: null,
        eventName: 'Answered',
        category: 'CALL',
        description: 'Call has been answered.',
        severity: 'SUCCESS',
        fields: ['callid', 'extension', 'answertime']
    },
    {
        eventId: null,
        eventName: 'Hangup',
        category: 'CALL',
        description: 'Call has ended.',
        severity: 'INFO',
        fields: ['callid', 'cause', 'duration']
    },
    {
        eventId: '30020',
        eventName: 'CallOver',
        category: 'CALL',
        description: 'Call ended / operation over. Contains detailed operation status.',
        severity: 'INFO',
        fields: ['operation', 'extension', 'call_id', 'ip_address']
    }
];

async function main() {
    console.log('🌱 Seeding Yeastar PBX event types...');

    for (const eventType of yeastarEventTypes) {
        await prisma.pBXEventType.upsert({
            where: { eventName: eventType.eventName },
            update: {
                eventId: eventType.eventId,
                category: eventType.category,
                description: eventType.description,
                severity: eventType.severity,
                fields: eventType.fields,
            },
            create: {
                eventId: eventType.eventId,
                eventName: eventType.eventName,
                category: eventType.category,
                description: eventType.description,
                severity: eventType.severity,
                fields: eventType.fields,
            },
        });
        console.log(`✅ Seeded event type: ${eventType.eventName} (${eventType.category})`);
    }

    console.log(`\n🎉 Successfully seeded ${yeastarEventTypes.length} Yeastar event types!`);
}

main()
    .catch((e) => {
        console.error('❌ Error seeding event types:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
