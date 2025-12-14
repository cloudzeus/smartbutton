
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAccessToken, getSettings } from '@/lib/yeastar-api';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        // Threshold: 60 seconds ago
        const threshold = new Date(Date.now() - 60 * 1000);

        // Find calls that are 'calling' or 'ringing' (not answered) and started > 60s ago
        const staleCalls = await prisma.call.findMany({
            where: {
                status: { in: ['calling', 'ringing', 'dialing', 'active'] },
                startTime: { lt: threshold },
                answerTime: null, // Not answered
                endTime: null     // Not ended
            }
        });

        if (staleCalls.length === 0) {
            return NextResponse.json({ success: true, count: 0 });
        }

        console.log(`⏰ Cleanup: Found ${staleCalls.length} stale calls (>60s) to terminate.`);

        const settings = await getSettings();
        const token = await getAccessToken('api');

        const results = [];

        for (const call of staleCalls) {
            // Hangup by Call ID
            const endpoint = '/call/hangup';
            const payload: any = { call_id: call.callId };

            const url = `https://${settings.pbxIp}:${settings.pbxPort}/openapi/v1.0${endpoint}?access_token=${encodeURIComponent(token)}`;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                // Assume success or best effort
                const result = await response.json().catch(() => ({}));
                console.log(`Terminated call ${call.callId}:`, result);

                // Update DB to mark as timeout
                await prisma.call.update({
                    where: { id: call.id },
                    data: {
                        status: 'timeout',
                        endTime: new Date()
                    }
                });

                // Reset associated extension status to 'online' (if extensionId exists)
                if (call.extensionId) {
                    await prisma.extension.update({
                        where: { id: call.extensionId },
                        data: { status: 'online' }
                    }).catch(e => console.warn("Failed to reset extension status:", e));
                }

                results.push({ id: call.id, status: 'terminated' });
            } catch (e: any) {
                console.error("Failed to terminate stale call", call.callId, e);
                results.push({ id: call.id, error: e.message });
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error("Timeout Job Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
