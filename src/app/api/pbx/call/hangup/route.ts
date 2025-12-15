
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAccessToken, getSettings } from '@/lib/yeastar-api';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { extensionId } = body;

        if (!extensionId) {
            return NextResponse.json(
                { success: false, error: 'Extension ID is required' },
                { status: 400 }
            );
        }

        console.log(`🛑 Terminating call for extension ${extensionId}...`);

        let callId = null;

        // 1. Find active call for this extension
        const activeCall = await prisma.call.findFirst({
            where: {
                extensionId: extensionId,
                status: { in: ['ringing', 'calling', 'connected', 'incall'] }
            },
            orderBy: { startTime: 'desc' }
        });

        if (activeCall) {
            callId = activeCall.callId;
        }

        // 2. If call ID found, send Hangup to PBX
        if (callId) {
            try {
                const settings = await getSettings();
                const token = await getAccessToken('api');
                const url = `https://${settings.pbxIp}:${settings.pbxPort}/openapi/v1.0/call/hangup?access_token=${encodeURIComponent(token)}`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ call_id: callId })
                });

                const data = await response.json();
                console.log('PBX Hangup Response:', data);

                // Mark call ended in DB
                await prisma.call.update({
                    where: { id: activeCall?.id },
                    data: { status: 'ended', endTime: new Date() }
                });

            } catch (e) {
                console.error('Failed to hangup on PBX:', e);
            }
        } else {
            console.log('No active call record found in DB, just resetting status.');
        }

        // 3. Always reset extension status to 'online' (Force Reset)
        await prisma.extension.update({
            where: { extensionId: extensionId },
            data: { status: 'online' }
        });

        return NextResponse.json({ success: true, message: 'Call terminated and status reset' });

    } catch (error) {
        console.error('Error in hangup route:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
