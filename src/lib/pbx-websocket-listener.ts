import WebSocket from 'ws';
import { prisma } from '@/lib/prisma';
import { YEASTAR_EVENTS } from '@/lib/pbx-events';
import { eventBus } from '@/lib/event-bus';
import { getAccessToken, getSettings } from '@/lib/yeastar-api';
import { categorizeEvent } from '@/lib/pbx-events';

let wsClient: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;
let isConnecting = false;

export async function startPBXWebSocket() {
    if (wsClient?.readyState === WebSocket.OPEN) {
        console.log('⚡️ PBX WebSocket already connected');
        return;
    }
    if (isConnecting) return;
    isConnecting = true;

    try {
        console.log('🔄 Initiating PBX WebSocket connection...');
        const settings = await getSettings();
        const token = await getAccessToken('websocket'); // This handles auth and caching for WebSocket specifically

        const protocol = 'wss';
        // Ensure we are using the correct endpoint for P-Series
        const url = `${protocol}://${settings.pbxIp}:${settings.pbxPort}/openapi/v1.0/subscribe?access_token=${encodeURIComponent(token)}`;

        console.log(`🔌 Connecting to PBX WebSocket: ${settings.pbxIp}`);

        // Pass rejectUnauthorized: false for self-signed certs
        wsClient = new WebSocket(url, {
            rejectUnauthorized: false,
            headers: {
                'User-Agent': 'OpenAPI'
            }
        });

        wsClient.on('open', () => {
            console.log('✅ PBX WebSocket Connected!');
            isConnecting = false;
            startHeartbeat();
            subscribeToEvents();
        });

        wsClient.on('message', async (data) => {
            try {
                const messageStr = data.toString();

                // Handle Heartbeat Response
                // The documentation says PBX returns a heartbeat response, often just "heartbeat" or a JSON
                if (messageStr === 'heartbeat' || messageStr === 'heartbeat response' || messageStr.includes('"status":"Success","response":"heartbeat"')) {
                    // console.log('💓 Received Heartbeat Ack');
                    return;
                }

                // Handle Subscription Response
                if (messageStr.includes('"errcode":0,"errmsg":"SUCCESS"')) {
                    console.log('✅ Event Subscription Successful');
                    return;
                }

                // console.log('📩 WebSocket Message:', messageStr);
                const event = JSON.parse(messageStr);
                await processEvent(event);
            } catch (err) {
                // If it's not JSON, it might be a plain text message or heartbeat ack we missed
                const msg = data.toString().trim();
                if (msg !== 'heartbeat' && msg !== 'heartbeat response') {
                    console.error('❌ Error processing WebSocket message:', err);
                }
            }
        });

        wsClient.on('error', (error) => {
            console.error('❌ PBX WebSocket Error:', error.message);
        });

        wsClient.on('close', async () => {
            console.warn('⚠️ PBX WebSocket Closed. Cleaning up states...');
            stopHeartbeat();

            // Clean up all active call states and extension statuses
            await cleanupOnDisconnect();

            wsClient = null;
            isConnecting = false;
            scheduleReconnect();
        });

    } catch (error: any) {
        console.error('❌ Failed to start PBX WebSocket:', error);
        isConnecting = false;

        // Check for Yeastar IP Block Error (70004)
        if (error.message?.includes('ACCOUNT IP BLOCKED') || error.message?.includes('70004')) {
            console.warn('🚫 IP ADDRESS BLOCKED BY PBX!');
            console.warn('⏳ Pausing reconnection for 11 minutes to allow block to expire...');
            scheduleReconnect(11 * 60 * 1000); // 11 minutes
        } else {
            scheduleReconnect();
        }
    }
}

function subscribeToEvents() {
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        // Subscribe to ALL available events as per user request
        // Event IDs from Yeastar API Documentation
        const allEventIds = [
            30005, // Organization Status Switch State Changed
            30006, // Organization Structure Changed
            30007, // Extension Registration Status Changed
            30008, // Extension Call State Changed
            30009, // Extension Presence State Changed
            30010, // Trunk Registration State Changed
            30011, // Call State Changed
            30012, // Call End Details Notification (CDR)
            30013, // Call Transfer Report
            30014, // Call Forwarding Report
            30015, // Call Failure Report
            30016, // Incoming Call Request
            30017, // DTMF Digit Report
            30018, // Prompt Playback Completed Report
            30019, // Satisfaction Survey Feedback
            30020, // uaCSTA Call Report
            30022, // Extension Information Updated
            30023, // Trunk Information Updated
            30024, // No-hosted Conference
            30025, // Agent Automatic Pause
            30026, // Agent Ringing Timeout
            30027, // Call Report Download Result
            30028, // Call Note Status Updated
            30029, // Agent Status Changed
            30030, // Bulk Message Sending Failed
            30031, // New Message Notification
            30032, // Message Sending Result
            30033  // Recording Download Completed
        ];

        const subscribeMsg = {
            topic_list: allEventIds
        };

        try {
            wsClient.send(JSON.stringify(subscribeMsg));
            console.log(`📨 Sent Event Subscription for ${allEventIds.length} events`);
        } catch (e) {
            console.error('Failed to send subscription:', e);
        }
    }
}


function startHeartbeat() {
    stopHeartbeat();
    // Send heartbeat every 30 seconds (timeout is 60s)
    heartbeatTimer = setInterval(() => {
        if (wsClient && wsClient.readyState === WebSocket.OPEN) {
            try {
                wsClient.send('heartbeat');
                // console.log('💓 Sent Heartbeat');
            } catch (e) {
                console.error('Failed to send heartbeat:', e);
            }
        }
    }, 30000);
}

function stopHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}

function scheduleReconnect(delay = 5000) {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
        startPBXWebSocket();
    }, delay);
}

async function processEvent(body: any) {
    // Basic validation
    if (!body || !body.event) return;

    const eventName = body.event;

    // Categorize using static helper (faster + consistency with webhook)
    const eventInfo = categorizeEvent(body);

    const severity = eventInfo.severity || 'INFO';
    const description = eventInfo.description || 'Unknown Event';
    const category = eventInfo.category || 'SYSTEM';

    // Parse nested 'msg' if it exists and is a string (Yeastar Webhook/WS behavior)
    let eventBody = { ...body };
    if (typeof body.msg === 'string') {
        try {
            const parsedMsg = JSON.parse(body.msg);
            eventBody = { ...eventBody, ...parsedMsg };
        } catch (e) {
            // ignore
        }
    } else if (typeof body.msg === 'object') {
        eventBody = { ...eventBody, ...body.msg };
    }

    // Store in DB using CORRECT Schema
    try {
        const savedEvent = await prisma.systemEvent.create({
            data: {
                eventType: eventName,
                eventData: {
                    category,
                    severity,
                    description,
                    message: JSON.stringify(body),
                    ...eventBody // Use flattened body
                }
            }
        });

        // Emit for Real-Time SSE
        eventBus.emit('pbx-event', savedEvent);

        // LIVE STATUS SYNC

        // 30008: Extension Call State Changed
        if ((eventName === '30008' || eventName === 'ExtensionCallState') && eventBody.extension && eventBody.state) {
            const status = eventBody.state.toLowerCase();
            await prisma.extension.update({
                where: { extensionId: eventBody.extension },
                data: { status, lastSeen: new Date() }
            }).catch(() => { });
        }

        // 30016: Incoming Call (Set Callee to Ringing)
        else if (eventName === '30016' && eventBody.callee) {
            await prisma.extension.update({
                where: { extensionId: eventBody.callee },
                data: { status: 'ringing', lastSeen: new Date() }
            }).catch(() => { });
        }

        // 30011: Call Status with Members (Complex Payload)
        else if (eventName === '30011' && Array.isArray(eventBody.members)) {
            // Track if this is a call answered event
            let isCallAnswered = false;
            const answeredExtensions: string[] = [];

            for (const member of eventBody.members) {
                // effective member structure: { extension: { number: "56", member_status: "ALERT" } }
                const extInfo = member.extension;
                if (extInfo && extInfo.number && extInfo.member_status) {
                    let status = 'idle';
                    const s = extInfo.member_status;
                    if (s === 'ALERT' || s === 'RING') status = 'ringing';
                    else if (s === 'ANSWER' || s === 'CONNECTED') {
                        status = 'incall';
                        isCallAnswered = true;
                        answeredExtensions.push(extInfo.number);
                    }
                    else if (s === 'RELEASE' || s === 'DISCONNECT') status = 'online';
                    else status = s.toLowerCase();

                    await prisma.extension.update({
                        where: { extensionId: extInfo.number },
                        data: { status, lastSeen: new Date() }
                    }).catch(() => { });
                }
            }

            // If call was answered, update the Call record status to 'connected'
            if (isCallAnswered && eventBody.call_id) {
                await prisma.call.updateMany({
                    where: { callId: eventBody.call_id },
                    data: {
                        status: 'connected',
                        answerTime: new Date()
                    }
                }).catch(() => { });
                console.log(`📞 Call ${eventBody.call_id} ANSWERED - Extensions: ${answeredExtensions.join(', ')}`);

                // Note: P550 doesn't support /prompt/upload endpoint
                // Instead, we'll play the alert.mp3 from our server
                // The frontend will handle playing the audio when it detects the call is answered
                // This is already implemented in the extensions page with the announcement audio
            }
        }

        // 30015: Call Failure (Reset status)
        else if (eventName === '30015') {
            const callId = eventBody.call_id;
            if (callId) {
                // Mark call as failed
                await prisma.call.updateMany({
                    where: { callId: callId },
                    data: { status: 'failed', endTime: new Date() }
                }).catch(() => { });

                // Find and reset extension logic (using callId)
                // Since members might be null, we rely on existing Call record
                const call = await prisma.call.findUnique({
                    where: { callId },
                    select: { extensionId: true, fromNumber: true, toNumber: true }
                }).catch(() => null);

                if (call && call.extensionId) {
                    await prisma.extension.update({
                        where: { id: call.extensionId },
                        data: { status: 'online' } // Reset to idle
                    }).catch(() => { });
                }
            }
        }

        // 30012: Call End Details (CDR) - Reset both extensions
        else if (eventName === '30012' || eventName === 'NewCdr') {
            const callId = eventBody.call_id;
            if (callId) {
                // Mark call as ended
                await prisma.call.updateMany({
                    where: { callId: callId },
                    data: { status: 'ended', endTime: new Date() }
                }).catch(() => { });

                // Reset both caller and callee extensions
                const fromExt = eventBody.caller || eventBody.from;
                const toExt = eventBody.callee || eventBody.to;

                if (fromExt) {
                    await prisma.extension.update({
                        where: { extensionId: fromExt },
                        data: { status: 'online', lastSeen: new Date() }
                    }).catch(() => { });
                }

                if (toExt) {
                    await prisma.extension.update({
                        where: { extensionId: toExt },
                        data: { status: 'online', lastSeen: new Date() }
                    }).catch(() => { });
                }

                console.log(`📞 Call ${callId} ENDED - Extensions reset: ${fromExt} & ${toExt}`);
            }
        }

        // 30020: CallOver (uaCSTA Call Report) - Reset extensions
        else if (eventName === '30020' || eventName === 'CallOver') {
            const callId = eventBody.call_id;
            if (callId) {
                // Mark call as ended
                await prisma.call.updateMany({
                    where: { callId: callId },
                    data: { status: 'ended', endTime: new Date() }
                }).catch(() => { });

                // Reset extensions involved in the call
                const fromExt = eventBody.caller || eventBody.from;
                const toExt = eventBody.callee || eventBody.to;

                if (fromExt) {
                    await prisma.extension.update({
                        where: { extensionId: fromExt },
                        data: { status: 'online', lastSeen: new Date() }
                    }).catch(() => { });
                }

                if (toExt) {
                    await prisma.extension.update({
                        where: { extensionId: toExt },
                        data: { status: 'online', lastSeen: new Date() }
                    }).catch(() => { });
                }

                console.log(`📞 Call ${callId} OVER - Extensions reset: ${fromExt} & ${toExt}`);
            }
        }

    } catch (e) {
        console.error('Failed to save event to DB:', e);
    }
}

/**
 * Clean up all active states when WebSocket disconnects
 * This prevents stale UI states and ensures clean reconnection
 */
async function cleanupOnDisconnect() {
    try {
        console.log('🧹 Cleaning up active call states and extension statuses...');

        // 1. Reset all extensions to 'online' status
        const updatedExtensions = await prisma.extension.updateMany({
            where: {
                status: { in: ['ringing', 'incall', 'busy'] }
            },
            data: {
                status: 'online',
                lastSeen: new Date()
            }
        });

        console.log(`✅ Reset ${updatedExtensions.count} extensions to online`);

        // 2. Mark all active calls as 'ended'
        const updatedCalls = await prisma.call.updateMany({
            where: {
                status: { in: ['calling', 'ringing', 'connected', 'active'] }
            },
            data: {
                status: 'ended',
                endTime: new Date()
            }
        });

        console.log(`✅ Marked ${updatedCalls.count} active calls as ended`);

        // 3. Emit cleanup event to frontend via event bus
        eventBus.emit('pbx-disconnected', {
            timestamp: new Date(),
            message: 'PBX WebSocket disconnected - states cleaned up'
        });

        console.log('✅ Cleanup complete - ready for reconnection');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    }
}
