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

        const body = JSON.parse(rawBody);

        console.log('📩 Milesight webhook received:', JSON.stringify(body, null, 2));

        // Extract button press information
        const {
            deviceId,
            deviceName,
            event,
            timestamp,
            data
        } = body;

        // Validate required fields
        if (!deviceId || !event) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: deviceId, event' },
                { status: 400 }
            );
        }

        // Check if this is a button press event
        if (event !== 'button_press' && event !== 'button_pressed' && event !== 'alarm') {
            console.log(`ℹ️ Ignoring non-button event: ${event}`);
            return NextResponse.json({
                success: true,
                message: 'Event received but not a button press'
            });
        }

        console.log(`🔔 BUTTON PRESSED! Device: ${deviceId} (${deviceName || 'Unknown'})`);

        // Trigger alert sequence (runs in background)
        triggerAlertSequence(deviceId, deviceName, data).catch(err => {
            console.error('❌ Alert sequence error:', err);
        });

        // Return immediately - don't wait for calls to complete
        return NextResponse.json({
            success: true,
            message: 'Alert triggered successfully',
            deviceId,
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
 * Calls recipients in order until someone answers
 * Runs SERVER-SIDE - no browser required
 */
async function triggerAlertSequence(deviceId: string, deviceName: string | undefined, data: any) {
    console.log(`🚨 Starting alert sequence for device: ${deviceId}`);

    // Get all active alert recipients in order
    const recipients = await prisma.alertRecipient.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' }
    });

    if (recipients.length === 0) {
        console.warn('⚠️ No alert recipients configured!');
        return;
    }

    console.log(`📞 Found ${recipients.length} recipients to call`);

    // Get base URL for API calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Call each recipient in order
    for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        console.log(`📞 Calling recipient #${i + 1}: ${recipient.label} (${recipient.number})`);

        try {
            // Initiate call
            const callResponse = await fetch(`${baseUrl}/api/pbx/call/dial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    caller: recipient.number,
                    callee: recipient.number,
                    auto_answer: recipient.type === 'EXTENSION' ? 'yes' : 'no'
                })
            });

            const callData = await callResponse.json();

            if (callData.success) {
                const callId = callData.data?.call_id;
                console.log(`✅ Call initiated to ${recipient.label}: ${callId}`);

                // Wait for answer (with timeout)
                const answered = await waitForAnswer(callId, recipient.number, 30000, baseUrl);

                if (answered) {
                    console.log(`✅ ${recipient.label} ANSWERED! Playing alert...`);

                    // Play alert.mp3
                    await playAlert(recipient.number, baseUrl);

                    console.log(`🎉 Alert sequence complete - answered by ${recipient.label}`);
                    return; // Stop calling once someone answers
                } else {
                    console.log(`⏭️ ${recipient.label} did not answer, trying next recipient...`);
                }
            } else {
                console.error(`❌ Failed to call ${recipient.label}:`, callData.error);
            }

        } catch (error) {
            console.error(`❌ Error calling ${recipient.label}:`, error);
        }

        // Small delay between calls
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.warn('⚠️ Alert sequence complete - NO ONE ANSWERED!');
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

/**
 * Play alert.mp3 to the extension
 */
async function playAlert(extensionNumber: string, baseUrl: string) {
    try {
        const playResponse = await fetch(`${baseUrl}/api/pbx/prompt/play`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                extension: extensionNumber,
                promptName: 'alert',
                volume: 20 // Max volume
            })
        });

        const playData = await playResponse.json();

        if (playData.success) {
            console.log(`🔊 Alert played to extension ${extensionNumber}`);
        } else {
            console.error(`❌ Failed to play alert:`, playData.error);
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
