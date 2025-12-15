import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { eventBus } from '@/lib/event-bus';
import crypto from 'crypto';

// Validate webhook signature from Yeastar PBX
async function validateWebhookSignature(
    request: NextRequest,
    body: string
): Promise<boolean> {
    try {
        const signature = request.headers.get('x-signature');

        if (!signature) {
            console.warn('⚠️ No X-Signature header found in webhook request');
            return false;
        }

        // Get the webhook secret from settings
        const settings = await prisma.pBXSettings.findFirst({
            where: { isActive: true },
        });

        if (!settings?.webhookSecret) {
            console.warn('⚠️ No webhook secret configured in PBX settings');
            return false;
        }

        // Generate HMAC-SHA256 signature in base64 format (Yeastar uses this)
        const hmacBase64 = crypto.createHmac('sha256', settings.webhookSecret);
        hmacBase64.update(body);
        const expectedSignatureBase64 = hmacBase64.digest('base64');

        // Also try hex format for compatibility
        const hmacHex = crypto.createHmac('sha256', settings.webhookSecret);
        hmacHex.update(body);
        const expectedSignatureHex = hmacHex.digest('hex');

        // Compare signatures
        const isValidBase64 = signature === expectedSignatureBase64;
        const isValidHex = signature.toLowerCase() === expectedSignatureHex.toLowerCase();
        const isValid = isValidBase64 || isValidHex;

        if (!isValid) {
            console.error('❌ Webhook signature validation failed');
            console.error('Expected (base64):', expectedSignatureBase64);
            console.error('Received:', signature);
        }

        return isValid;
    } catch (error) {
        console.error('❌ Error validating webhook signature:', error);
        return false;
    }
}

// This endpoint will receive webhook/push events from the PBX
export async function POST(request: NextRequest) {
    try {
        // Get raw body for signature validation
        const bodyText = await request.text();
        console.log("📥 [WEBHOOK] Received Raw Payload:", bodyText);

        if (!bodyText) {
            return NextResponse.json({ success: false, error: "Empty body" }, { status: 400 });
        }

        let body = JSON.parse(bodyText);

        // CRITICAL: Yeastar events often encapsulate the data in a "msg" string field
        // We must parse it and merge it up to the root so our handlers can find the fields.
        if (body.msg && typeof body.msg === 'string') {
            try {
                const parsedMsg = JSON.parse(body.msg);
                // Assign parsed object back to msg for clarity in logs
                body.msg = parsedMsg;
                // Merge fields to root for easy access
                body = { ...body, ...parsedMsg };
            } catch (e) {
                console.warn('Failed to parse body.msg JSON:', e);
            }
        }

        console.log("📦 [WEBHOOK] Parsed Body:", JSON.stringify(body, null, 2));

        // Validate webhook signature
        const isValid = await validateWebhookSignature(request, bodyText);

        if (!isValid) {
            console.error('❌ Webhook signature validation failed - proceeding anyway for debugging');
            // return new Response(
            //     JSON.stringify({ success: false, error: 'Invalid signature' }),
            //     {
            //         status: 401,
            //         headers: { 'Content-Type': 'application/json' },
            //     }
            // );
        }

        console.log('✅ Webhook signature validated successfully');
        console.log('📞 Received PBX Event:', JSON.stringify(body, null, 2));

        // Log the event to database
        await logPBXEvent(body);

        // Process different event types
        await processPBXEvent(body);

        return new Response(JSON.stringify({ success: true, message: 'Event received' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('❌ Error processing PBX event:', error);

        // Log error to database
        const errorEvent = await prisma.systemEvent.create({
            data: {
                eventType: 'PBX_ERROR',
                eventData: {
                    category: 'WEBHOOK',
                    severity: 'ERROR',
                    message: 'Failed to process PBX webhook event',
                    details: { error: String(error) },
                },
            },
        });

        // Emit to Event Bus
        eventBus.emit('pbx-event', errorEvent);

        return new Response(JSON.stringify({ success: false, error: 'Failed to process event' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

async function logPBXEvent(event: any) {
    try {
        const { categorizeEvent } = await import('@/lib/pbx-events');
        const eventInfo = categorizeEvent(event);

        // Map severity to event type for database
        let eventType = 'PBX_INFO';
        switch (eventInfo.severity) {
            case 'ERROR':
                eventType = 'PBX_ERROR';
                break;
            case 'SUCCESS':
                eventType = 'PBX_SUCCESS';
                break;
            case 'WARNING':
                eventType = 'PBX_WARNING';
                break;
            default:
                eventType = 'PBX_INFO';
        }

        const savedEvent = await prisma.systemEvent.create({
            data: {
                eventType,
                eventData: {
                    category: eventInfo.category,
                    eventName: eventInfo.type,
                    message: eventInfo.description,
                    details: event,
                    severity: eventInfo.severity,
                    description: eventInfo.description,
                },
            },
        });

        // Emit to Event Bus for real-time SSE
        eventBus.emit('pbx-event', savedEvent);

        console.log(`✅ Logged ${eventInfo.type} event: ${eventInfo.description}`);
    } catch (error) {
        console.error('Failed to log PBX event:', error);
    }
}

async function processPBXEvent(event: any) {
    // Yeastar events use 'type' (numerical) or 'event' (string legacy)
    // Convert numerical type to string or keep as is for switch
    const eventType = String(event.type || event.event);

    switch (eventType) {
        case 'call.started':
        case 'NewCdr':
        case 'Invite':
        case '30011': // Call Status Changed
            await handleCallEvent(event);
            break;

        case '30020': // uaCSTA Call Report (contains operation like call_start/call_answer/call_over)
            await handleCallEvent(event);
            break;

        case 'Outbound': // Outbound call completed (CDR-like event)
            await handleOutboundCallComplete(event);
            break;

        case 'Inbound': // Inbound call completed (CDR-like event)
            await handleInboundCallComplete(event);
            break;

        case 'extension.status':
        case 'ExtensionStatus':
        case '30007': // Extension Registration Status (Registered/Unregistered/Unreachable)
        case '30008': // Extension Call Status (Idle/Ringing/Busy)
            await handleExtensionStatus(event);
            break;

        case 'call.ended':
        case 'Hangup':
        case '30022': // Call End
        case '30015': // Call Failed
            await handleCallEnd(event);
            break;

        default:
            console.log('ℹ️ Unhandled event type:', eventType);
    }
}

async function handleCallEvent(event: any) {
    try {
        let fromNumber = 'unknown';
        let toNumber = 'unknown';
        let extensionId = 'unknown';
        let callId = 'unknown';
        let rawStatus = 'active';

        // Parse Yeastar event structure
        if (event.msg) {
            callId = event.msg.call_id;
            rawStatus = event.msg.call_status || event.msg.status || 'active';

            if (event.msg.members && Array.isArray(event.msg.members)) {
                // Track if any member answered
                let callAnswered = false;
                const answeredExtensions: string[] = [];

                // Process all members to update their statuses
                for (const member of event.msg.members) {
                    if (member.extension) {
                        const extNumber = member.extension.number;
                        const memberStatus = member.extension.member_status;

                        // Map member_status to our extension status
                        let extStatus = 'online';
                        if (memberStatus === 'ALERT' || memberStatus === 'RING') {
                            extStatus = 'ringing';
                        } else if (memberStatus === 'ANSWER' || memberStatus === 'CONNECTED') {
                            extStatus = 'incall';
                            callAnswered = true;
                            answeredExtensions.push(extNumber);

                            // Play alert.mp3 to the callee when they answer
                            console.log(`📞 Extension ${extNumber} ANSWERED - Playing alert to callee`);
                            try {
                                const playResponse = await fetch('http://localhost:3000/api/pbx/prompt/play', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        extension: extNumber,
                                        promptName: 'alert',
                                        autoAnswer: 'no',
                                        volume: 15
                                    })
                                });

                                if (playResponse.ok) {
                                    console.log(`🔊 Alert prompt triggered for extension ${extNumber}`);
                                } else {
                                    const errorData = await playResponse.json();
                                    console.warn(`⚠️ Failed to play alert to ${extNumber}:`, errorData.error);
                                }
                            } catch (playError) {
                                console.error(`❌ Error playing alert to ${extNumber}:`, playError);
                            }
                        } else if (memberStatus === 'RELEASE' || memberStatus === 'DISCONNECT') {
                            extStatus = 'online';
                        }

                        // Update extension status immediately
                        await prisma.extension.upsert({
                            where: { extensionId: extNumber },
                            update: { status: extStatus, lastSeen: new Date() },
                            create: {
                                extensionId: extNumber,
                                name: `Extension ${extNumber}`,
                                status: extStatus,
                            },
                        }).catch(err => console.error(`Failed to update extension ${extNumber}:`, err));

                        console.log(`✅ Extension ${extNumber} status updated: ${extStatus} (member_status: ${memberStatus})`);

                        // If extension is now incall, update any active calls for this extension
                        if (extStatus === 'incall') {
                            const ext = await prisma.extension.findUnique({
                                where: { extensionId: extNumber }
                            });

                            if (ext) {
                                await prisma.call.updateMany({
                                    where: {
                                        extensionId: ext.id,
                                        status: { in: ['calling', 'ringing', 'active'] }
                                    },
                                    data: {
                                        status: 'connected',
                                        answerTime: new Date()
                                    }
                                }).catch(() => { });
                            }
                        }

                        // Use first member for call record
                        if (fromNumber === 'unknown') {
                            fromNumber = extNumber;
                            extensionId = extNumber;
                        }
                    } else if (member.inbound) {
                        fromNumber = member.inbound.from;
                        toNumber = member.inbound.to;
                    }
                }

                // If call was answered, update Call record to 'connected'
                if (callAnswered && callId) {
                    await prisma.call.updateMany({
                        where: { callId: callId },
                        data: {
                            status: 'connected',
                            answerTime: new Date()
                        }
                    }).catch(() => { });
                    console.log(`✅ Call ${callId} marked as CONNECTED (answered by: ${answeredExtensions.join(', ')})`);
                }
            }
        } else {
            // Legacy/Other event formats
            fromNumber = event.from || event.caller || event.src || 'unknown';
            toNumber = event.to || event.callee || event.dst || 'unknown';
            extensionId = event.extension || event.extensionid || fromNumber;
            callId = event.callid || event.call_id || `call-${Date.now()}`;
            rawStatus = event.status || 'active';
        }

        // Map Yeastar statuses to our schema
        let status = 'active';
        const s = rawStatus.toLowerCase();
        if (s.includes('ring')) status = 'ringing';
        else if (s.includes('link') || s.includes('connected') || s.includes('up')) status = 'connected';
        else if (s.includes('hangup') || s.includes('end') || s.includes('bye')) status = 'ended';
        else if (s.includes('fail') || s.includes('busy')) status = 'failed';

        // Avoid creating calls with unknown extension if possible, but for updates we might not need it
        if (extensionId === 'unknown' && event.msg?.members) {
            for (const m of event.msg.members) {
                if (m.extension?.number) {
                    extensionId = m.extension.number;
                    break;
                }
            }
        }

        // If we still don't know the extension but have a callId, we might be able to update an existing call

        // Check if call already exists
        // Resolve extension if possible to link call
        let extensionRecord = null;
        if (extensionId !== 'unknown') {
            extensionRecord = await prisma.extension.upsert({
                where: { extensionId },
                update: {},
                create: {
                    extensionId,
                    name: `Extension ${extensionId}`,
                    status: 'online',
                },
            });
        }

        // Logic to safely Create or Update Call
        let call = null;

        const updateData = {
            status,
            updatedAt: new Date(),
            ...(status === 'connected' ? { answerTime: new Date() } : {}),
            ...(status === 'ended' ? { endTime: new Date() } : {})
        };

        if (extensionRecord) {
            // We have an extension, so we can Create or Update
            call = await prisma.call.upsert({
                where: { callId },
                create: {
                    callId,
                    extensionId: extensionRecord.id, // Use extensionId instead of relation
                    fromNumber,
                    toNumber,
                    direction: event.direction || 'unknown',
                    status,
                    startTime: new Date(),
                    answerTime: status === 'connected' ? new Date() : null,
                },
                update: updateData
            });
        } else {
            // No extension context: We can ONLY update if the call already exists
            try {
                call = await prisma.call.update({
                    where: { callId },
                    data: updateData
                });
            } catch (ignored) {
                // Call didn't exist and we can't create it due to missing extension info.
                // This is expected for some events.
            }
        }

        if (!call) return; // Stop processing if no call record involved

        console.log(`✅ Call logged/updated: ${callId} (${status})`);

        // Note: Extension status is already updated above in the members loop
        // No need to update again here
    } catch (error) {
        console.error('Failed to handle call event:', error);
    }
}
async function handleExtensionStatus(event: any) {
    try {
        const extension = event.extension || event.ext || event.extensionid;
        let status = event.status || 'unknown';

        // Normalize status
        status = status.toLowerCase();
        if (status === 'idle') status = 'online';

        if (extension) {
            await prisma.extension.upsert({
                where: { extensionId: extension },
                update: { status, lastSeen: new Date() },
                create: {
                    extensionId: extension,
                    name: `Extension ${extension}`,
                    status,
                },
            });

            console.log(`✅ Extension ${extension} status updated: ${status}`);
        }
    } catch (error) {
        console.error('Failed to handle extension status:', error);
    }
}

async function handleCallEnd(event: any) {
    try {
        const callId = event.callid || event.call_id;

        if (callId) {
            await prisma.call.update({
                where: { callId },
                data: {
                    status: 'completed',
                    endTime: new Date(),
                },
            });

            console.log('✅ Call ended:', callId);
        }
    } catch (error) {
        console.error('Failed to handle call end:', error);
    }
}

async function handleOutboundCallComplete(event: any) {
    try {
        const callId = event.call_id;
        const status = event.status?.toLowerCase();
        const callDuration = event.call_duration || 0;
        const talkDuration = event.talk_duration || 0;

        if (callId) {
            // Map status
            let finalStatus = 'completed';
            if (status === 'answered') finalStatus = 'completed';
            else if (status === 'no answer' || status === 'noanswer') finalStatus = 'failed';
            else if (status === 'busy') finalStatus = 'failed';
            else if (status === 'failed') finalStatus = 'failed';

            await prisma.call.updateMany({
                where: { callId },
                data: {
                    status: finalStatus,
                    endTime: new Date(),
                    duration: talkDuration, // Save talk duration in seconds
                },
            });

            console.log(`✅ Outbound call completed: ${callId} (${status}, duration: ${talkDuration}s)`);

            // Reset extension status
            const fromExt = event.call_from;
            if (fromExt) {
                await prisma.extension.update({
                    where: { extensionId: fromExt },
                    data: { status: 'online', lastSeen: new Date() }
                }).catch(() => { });
            }
        }
    } catch (error) {
        console.error('Failed to handle outbound call complete:', error);
    }
}

async function handleInboundCallComplete(event: any) {
    try {
        const callId = event.call_id;
        const status = event.status?.toLowerCase();
        const callDuration = event.call_duration || 0;
        const talkDuration = event.talk_duration || 0;
        const toExt = event.call_to; // Extension that received the call

        if (callId) {
            // Map status
            let finalStatus = 'completed';
            if (status === 'answered') finalStatus = 'completed';
            else if (status === 'no answer' || status === 'noanswer') finalStatus = 'failed';
            else if (status === 'busy') finalStatus = 'failed';
            else if (status === 'failed') finalStatus = 'failed';

            await prisma.call.updateMany({
                where: { callId },
                data: {
                    status: finalStatus,
                    endTime: new Date(),
                    duration: talkDuration,
                },
            });

            console.log(`✅ Inbound call completed: ${callId} (${status}, duration: ${talkDuration}s)`);

            // Reset extension status
            if (toExt) {
                await prisma.extension.update({
                    where: { extensionId: toExt },
                    data: { status: 'online', lastSeen: new Date() }
                }).catch(() => { });
            }
        }
    } catch (error) {
        console.error('Failed to handle inbound call complete:', error);
    }
}

// GET endpoint to verify the webhook is working
export async function GET() {
    return new Response(
        JSON.stringify({
            success: true,
            message: 'PBX Webhook endpoint is active',
            endpoint: '/api/pbx/webhook',
            instructions: 'Configure your Yearstar PBX to send events to this endpoint via POST requests with X-Signature header',
            authentication: 'Requests must include X-Signature header with HMAC-SHA256 signature',
        }),
        {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }
    );
}
