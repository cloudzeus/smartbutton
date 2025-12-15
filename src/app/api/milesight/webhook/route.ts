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

        // Trigger Alert Sequence (Call configured recipients)
        triggerAlertSequence(extensionNumber, deviceName).catch(err => {
            console.error('❌ Alert sequence error:', err);
        });

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
    await updateExtensionStatus(originExtension, 'ringing');

    // Get all active alert recipients in order
    const recipients = await prisma.alertRecipient.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' }
    });

    if (recipients.length === 0) {
        console.warn('⚠️ No alert recipients configured in PBX Settings!');
        await updateExtensionStatus(originExtension, 'online'); // Reset status
        return;
    }

    console.log(`📞 Found ${recipients.length} recipients to call`);

    // Get base URL for API calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    let anyAnswered = false;

    // Fetch Announcement Name from PBX Settings
    const settings = await prisma.pBXSettings.findFirst({
        where: { isActive: true }
    });
    const announcementName = settings?.smartButtonAnnouncement || 'alert';
    const dialPermission = settings?.outboundPermissionExtension || undefined;

    // Call each recipient in order

    for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        console.log(`📞 Calling recipient #${i + 1}: ${recipient.label} (${recipient.number})`);

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
                    continue;
                }
                if (dialPermission === originExtension) {
                    console.error(`❌ Configuration Error: Outbound Permission Extension is set to the Smart Button's extension (${originExtension}). This will cause 503 Busy. Please use a registered phone extension.`);
                    // We proceed but it likely fails
                }

                // Initiate call via Play Prompt (Calls User -> Waits Answer -> Plays)
                // This prevents the Origin Extension (Room Button) from ringing
                // Pass dialPermission if configured (crucial for calling mobile numbers)
                const result = await playAlert(recipient.number, baseUrl, announcementName, dialPermission);

                if (result && result.success && result.callId) {
                    const callId = result.callId;
                    console.log(`   ✅ Call initiated: ${callId}`);

                    // Wait for answer (with timeout)
                    const answered = await waitForAnswer(callId, recipient.number, 30000, baseUrl);

                    if (answered) {
                        console.log(`   ✅ ${recipient.label} ANSWERED!`);
                        recipientAnswered = true;
                        anyAnswered = true;

                        console.log(`🎉 Alert sequence complete - connected to ${recipient.label}`);
                        break; // Stop retrying this recipient (and stop outer loop via check)
                    } else {
                        console.log(`   ⏭️ ${recipient.label} did not answer attempt ${attempts}.`);
                    }
                } else {
                    console.error(`   ❌ Failed to call ${recipient.label}:`, result?.error);
                }

            } catch (error) {
                console.error(`   ❌ Error calling ${recipient.label}:`, error);
            }

            // Delay between attempts if not answered
            if (!recipientAnswered && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        if (anyAnswered) break; // Stop calling other recipients if someone answered
    }

    if (!anyAnswered) {
        console.warn('⚠️ Alert sequence complete - NO ONE ANSWERED!');
    }

    // Reset extension status to ONLINE after sequence
    await updateExtensionStatus(originExtension, 'online');
}

async function updateExtensionStatus(extensionId: string, status: string) {
    try {
        await prisma.extension.update({
            where: { extensionId },
            data: { status }
        });
    } catch (e) {
        console.error(`Failed to update extension ${extensionId} status to ${status}`, e);
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
            const statusResponse = await fetch(`${baseUrl}/api/pbx/call/status?callId=${callId}`);
            const statusData = await statusResponse.json();

            if (statusData.success && statusData.data) {
                const status = statusData.data.status?.toLowerCase() || '';

                if (status.includes('connect') || status.includes('answer') || status.includes('up')) {
                    return true; // Call answered!
                }

                if (status.includes('end') || status.includes('fail') || status.includes('busy')) {
                    return false; // Call failed
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

const ANNOUNCEMENT_NAME = 'alert'; // Change this to your desired PBX prompt filename

// ... (inside triggerAlertSequence) use ANNOUNCEMENT_NAME instead of 'alert'
// But wait, I can't put const inside replacement chunk easily if it's far away.
// I will just update playAlert to accept the name.

/**
 * Play alert prompt to the extension
 */
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
    }
}

// GET endpoint for testing
export async function GET() {
    return NextResponse.json({
        success: true,
        message: 'Milesight webhook endpoint is active',
        endpoint: '/api/milesight/webhook',
        method: 'POST',
        serverSide: true,
        requiresAuth: false,
        expectedPayload: {
            deviceId: 'button-room-101',
            deviceName: 'Room 101 Button',
            event: 'button_press',
            timestamp: '2025-12-15T10:00:00Z',
            data: {
                room: '101',
                buttonType: 'emergency'
            }
        }
    });
}
