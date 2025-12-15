
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMilesightWebhook } from '@/lib/milesight-api';

/**
 * Milesight Smart Button Webhook Endpoint
 * Receives push notifications when smart buttons are pressed
 * 
 * Webhook URL: https://your-domain.com/api/milesight/webhook
 * 
 * This runs SERVER-SIDE ONLY - no browser or user login required
 */

export async function POST(request: NextRequest) {
    try {
        // Get raw body for signature verification
        const rawBody = await request.text();
        const signature = request.headers.get('x-milesight-signature') ||
            request.headers.get('x-signature') ||
            null;

        // Verify webhook signature
        if (!verifyMilesightWebhook(rawBody, signature)) {
            console.error('❌ Invalid webhook signature');
            return NextResponse.json(
                { success: false, error: 'Invalid signature' },
                { status: 401 }
            );
        }

        let body = JSON.parse(rawBody);

        // Handle array payload (Milesight often sends array of events)
        if (Array.isArray(body)) {
            body = body[0]; // Process first event for now
        }

        console.log('📩 Milesight webhook received:', JSON.stringify(body, null, 2));

        // Extract event info from new structure
        // Structure: { eventType: "DEVICE_DATA", data: { deviceProfile: { sn, ... }, tslId: "button_event", payload: { status: "1" } } }
        const eventType = body.eventType;
        const deviceData = body.data || {};
        const profile = deviceData.deviceProfile || {};

        const sn = profile.sn; // Serial Number is the reliable identifier
        const tslId = deviceData.tslId;
        const payload = deviceData.payload || {};
        const isButtonPressed = tslId === 'button_event' && String(payload.status) === '1';

        // Validate required fields
        if (!sn) {
            return NextResponse.json(
                { success: false, error: 'Missing device SN' },
                { status: 400 }
            );
        }

        // Check if this is a button press event
        if (!isButtonPressed) {
            console.log(`ℹ️ Ignoring non-button event or button release: ${tslId} status=${payload.status}`);
            return NextResponse.json({
                success: true,
                message: 'Event received but not a button press'
            });
        }

        console.log(`🔔 BUTTON PRESSED! SN: ${sn}`);

        // Find device and assigned extension in DB
        // We match by Serial Number because Webhook deviceId might differ from OpenAPI deviceId
        const device = await prisma.milesightDevice.findFirst({
            where: { serialNumber: sn },
            include: { assignedExtension: true }
        });

        if (!device) {
            console.warn(`⚠️ Device with SN ${sn} not found in database. Please run Sync first.`);
            return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
        }

        if (!device.assignedExtension) {
            console.warn(`⚠️ Device ${device.deviceName} (${sn}) has no assigned extension.`);
            return NextResponse.json({ success: true, message: 'Device has no assigned extension' });
        }

        const extensionNumber = device.assignedExtension.extensionId;
        const deviceName = device.assignedExtension.name || device.deviceName;

        console.log(`🔔 Button Pressed in ${deviceName} (Ext: ${extensionNumber})`);
        console.log(`📞 Starting Alert Sequence to configured recipients...`);

        // Trigger Alert Sequence (Background)
        // Do NOT await this, otherwise Milesight will timeout and retry the webhook
        triggerAlertSequence(extensionNumber, deviceName)
            .catch(err => console.error('❌ Error in alert sequence:', err));

        return NextResponse.json({
            success: true,
            message: `Alert triggered from ${extensionNumber}`,
            sn,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Milesight webhook error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * Trigger alert call sequence
 * Calls recipients defined in PBX Settings (prisma.alertRecipient)
 */
async function triggerAlertSequence(originExtension: string, originName: string) {
    console.log(`🚨 Starting alert sequence from: ${originName} (${originExtension})`);

    // Update extension status to RINGING (triggers frontend alert)
    // This is purely visual for the System View
    await updateExtensionStatus(originExtension, 'ringing');

    try {
        // Get all active alert recipients in order
        const recipients = await prisma.alertRecipient.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' }
        });

        if (recipients.length === 0) {
            console.warn('⚠️ No alert recipients configured in PBX Settings!');
            return;
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

        const settings = await prisma.pBXSettings.findFirst({
            where: { isActive: true }
        });
        const announcementName = settings?.smartButtonAnnouncement || 'alert';
        const dialPermission = settings?.outboundPermissionExtension || undefined;

        console.log(`🚀 STARTING ALERT SEQUENCE from Button (Ext: ${originExtension})`);
        console.log(`📋 Found ${recipients.length} configured recipients.`);

        let anyRecipientAnswered = false;

        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i];
            console.log(`👉 Processing Recipient ${i + 1}/${recipients.length}: ${recipient.label} (Number: ${recipient.number})`);

            // Retry logic: Try 3 times
            const maxAttempts = 3;
            let attempts = 0;
            let recipientAnswered = false;

            while (attempts < maxAttempts && !recipientAnswered) {
                attempts++;
                console.log(`   🔄 Attempt ${attempts}/${maxAttempts} for ${recipient.label}...`);

                try {
                    // Config Check: Prevent calling self or using self as permission
                    if (recipient.number === originExtension) {
                        console.warn(`⚠️ Skipping recipient ${recipient.label}: Cannot call the Smart Button's own extension (${originExtension}).`);
                        break;
                    }
                    if (dialPermission === originExtension) {
                        console.error(`❌ Configuration Error: Outbound Permission Extension is set to the Smart Button's extension (${originExtension}). This will cause 503 Busy. Please use a registered phone extension.`);
                    }

                    // Initiate call via Play Prompt
                    const result = await playAlert(recipient.number, baseUrl, announcementName, dialPermission);

                    if (result && result.success && result.callId) {
                        const callId = result.callId;
                        console.log(`   ✅ Call initiated: ${callId}`);

                        // Create Call Record in DB so waitForAnswer can track it
                        await prisma.call.create({
                            data: {
                                callId: callId,
                                extensionId: originExtension, // Associate with Smart Button extension for tracking
                                fromNumber: originExtension,
                                toNumber: recipient.number,
                                direction: 'outbound',
                                status: 'calling',
                                startTime: new Date()
                            }
                        }).catch(e => console.error('Failed to create call record:', e));

                        // Wait for answer (with 60s timeout)
                        const answered = await waitForAnswer(callId, recipient.number, 60000, baseUrl);

                        if (answered) {
                            const answeredTime = new Date().toLocaleTimeString();
                            console.log(`✅ Alert successfully delivered (Answered) by ${recipient.label} (${recipient.number}) at ${answeredTime}!`);

                            recipientAnswered = true;
                            anyRecipientAnswered = true;
                            // Update Call Status to Completed/Ended logic? 
                            // The listener updates status to 'connected'.
                            // We don't need to do more, PBX call will end naturally after prompt.
                            break; // Stop retrying this recipient
                        } else {
                            console.warn(`⚠️ Call to ${recipient.label} was NOT answered (Timeout/Busy/Failed).`);
                        }
                    } else {
                        console.error(`❌ Call initiation failed for ${recipient.label}: ${result?.error}`);
                    }

                } catch (error) {
                    console.error(`❌ Error Calling ${recipient.label}:`, error);
                }

                // Delay between retries
                if (!recipientAnswered && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }

            // If this recipient answered, stop calling OTHER recipients too (Task Completed)
            if (recipientAnswered) {
                console.log('🎉 Task Completed: Call Answered.');
                break;
            }
        }

        if (!anyRecipientAnswered) {
            console.warn('⚠️ Alert sequence complete - NO ONE ANSWERED!');
        }

    } catch (e) {
        console.error('Error in triggerAlertSequence:', e);
    } finally {
        // CLEANUP: Reset Origin Extension Status to 'online'
        // This ensures the Manual 'ringing' status is cleared
        console.log(`🧹 Resetting manual status for Button Extension ${originExtension} to 'online'`);
        await updateExtensionStatus(originExtension, 'online');
    }
}

async function updateExtensionStatus(extensionId: string, status: string) {
    try {
        await prisma.extension.update({
            where: { extensionId },
            data: { status, lastSeen: new Date() }
        });
    } catch (e) {
        console.error(`Failed to update extension ${extensionId} status to ${status}`, e);
    }
}

async function playAlert(extensionNumber: string, baseUrl: string, promptName: string = 'alert', dialPermission?: string) {
    try {
        const playResponse = await fetch(`${baseUrl}/api/pbx/prompt/play`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                extension: extensionNumber,
                promptName: promptName, // Use the passed name
                volume: 20, // Max volume
                dialPermission: dialPermission // Pass permission extension
            })
        });

        const playData = await playResponse.json();

        if (playData.success) {
            console.log(`🔊 Alert prompt '${promptName}' played to extension ${extensionNumber}`);
            return { success: true, callId: playData.data?.call_id };
        } else {
            console.error(`❌ Failed to play alert to ${extensionNumber}: PBX Error ${playData.error} (Code: ${playData.errcode})`);
            return { success: false, error: playData.error };
        }

    } catch (error) {
        console.error('Error playing alert:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Wait for call to be answered
 * Polls call status until answered or timeout
 */
async function waitForAnswer(callId: string | undefined, extensionNumber: string, timeout: number, baseUrl: string): Promise<boolean> {
    if (!callId) {
        // Fallback: check extension status instead
        return waitForExtensionAnswer(extensionNumber, timeout);
    }

    const startTime = Date.now();
    const pollInterval = 1000; // Check every second

    while (Date.now() - startTime < timeout) {
        try {
            // Direct DB Query (Avoids self-fetch deadlock)
            const call = await prisma.call.findUnique({
                where: { callId }
            });

            if (call) {
                const status = call.status?.toLowerCase() || '';

                if (status.includes('connect') || status.includes('answer') || status.includes('up')) {
                    return true; // Call answered!
                }

                if (status.includes('end') || status.includes('fail') || status.includes('busy')) {
                    // Wait, if it failed quickly, we should return false.
                    return false;
                }
            }

        } catch (error) {
            console.error('Error checking call status:', error);
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    return false; // Timeout
}

/**
 * Fallback: Wait for extension status to change to 'incall'
 */
async function waitForExtensionAnswer(extensionNumber: string, timeout: number): Promise<boolean> {
    const startTime = Date.now();
    const pollInterval = 1000;

    while (Date.now() - startTime < timeout) {
        try {
            const extension = await prisma.extension.findUnique({
                where: { extensionId: extensionNumber }
            });

            if (extension && extension.status === 'incall') {
                return true; // Extension answered!
            }

        } catch (error) {
            console.error('Error checking extension status:', error);
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    return false; // Timeout
}

// GET endpoint for testing checks
export async function GET() {
    return NextResponse.json({
        success: true,
        message: 'Milesight webhook endpoint is active',
        endpoint: '/api/milesight/webhook',
        method: 'POST',
        serverSide: true,
        requiresAuth: false
    });
}
