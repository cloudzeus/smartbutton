
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAccessToken, getSettings } from '@/lib/yeastar-api';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { callId, extension } = body;

        if (!callId && !extension) {
            return NextResponse.json(
                { success: false, error: 'Call ID or Extension is required' },
                { status: 400 }
            );
        }

        const settings = await getSettings();
        const token = await getAccessToken('api');

        // P-Series Endpoint: /extension/hangup (or /call/hangup)
        // https://help.yeastar.com/en/p-series-cloud-edition/developer-guide/hangup.html
        // Prioritize /call/hangup as it uses call_id to terminate the session
        const endpoints = ['/call/hangup', '/extension/hangup'];
        let lastError = null;

        for (const endpoint of endpoints) {
            const url = `https://${settings.pbxIp}:${settings.pbxPort}/openapi/v1.0${endpoint}?access_token=${encodeURIComponent(token)}`;

            console.log(`📞 Hanging up call (ID: ${callId}, Ext: ${extension}) via ${endpoint}...`);

            const payload: any = {};
            if (callId) payload.call_id = callId;
            if (extension) payload.extension = extension;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'OpenAPI'
                    },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    lastError = new Error(`PBX status ${response.status}: ${errorText}`);
                    continue;
                }

                const data = await response.json();

                if (data.errcode === 0) {
                    // Manual Cleanup (Garbage Collection)
                    // Reset extension status to online/idle immediately
                    if (extension) {
                        prisma.extension.update({
                            where: { extensionId: extension },
                            data: { status: 'online', lastSeen: new Date() }
                        }).catch(() => { });
                    }
                    if (callId) {
                        prisma.call.updateMany({
                            where: { callId: callId },
                            data: { status: 'terminated', endTime: new Date() }
                        }).catch(() => { });

                        // Try to find extension from call if not provided
                        if (!extension) {
                            prisma.call.findFirst({ where: { callId }, select: { extensionId: true } })
                                .then(c => {
                                    if (c?.extensionId) {
                                        prisma.extension.update({
                                            where: { id: c.extensionId },
                                            data: { status: 'online' }
                                        }).catch(() => { });
                                    }
                                });
                        }
                    }

                    return NextResponse.json({ success: true, data });
                }

                if (data.errcode === 10001) { // Not Existed
                    // Cleanup anyway, as it's gone
                    if (extension) {
                        prisma.extension.update({
                            where: { extensionId: extension },
                            data: { status: 'online' }
                        }).catch(() => { });
                    }
                    continue; // Try next endpoint just in case
                }

                throw new Error(`PBX API Error ${data.errcode}: ${data.errmsg}`);

            } catch (error: any) {
                console.warn(`Failed attempt on ${endpoint}:`, error.message);
                lastError = error;
            }
        }

        throw lastError || new Error('Failed to hang up call via any endpoint');

    } catch (error: any) {
        console.error('Hangup Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to hang up call' },
            { status: 500 }
        );
    }
}
