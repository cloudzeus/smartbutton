
import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, getSettings } from '@/lib/yeastar-api';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { caller, callee, auto_answer } = body;

        if (!caller || !callee) {
            return NextResponse.json(
                { success: false, error: 'Caller and Callee are required' },
                { status: 400 }
            );
        }

        const settings = await getSettings();
        const token = await getAccessToken('api'); // Use API token (not WS)

        // Try multiple endpoints as P-Series versions differ
        const endpoints = ['/extension/dial', '/call/dial'];
        let lastError = null;

        for (const endpoint of endpoints) {
            const url = `https://${settings.pbxIp}:${settings.pbxPort}/openapi/v1.0${endpoint}?access_token=${encodeURIComponent(token)}`;

            console.log(`📞 Dialing ${caller} -> ${callee} via ${endpoint}...`);

            try {
                const payload: any = {
                    caller: caller,
                    callee: callee
                };

                if (auto_answer) {
                    payload.auto_answer = "yes"; // or logic specific to Yeastar version
                }

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
                    continue; // Try next endpoint
                }

                const data = await response.json();

                if (data.errcode === 0) {
                    // Create Call record immediately to prevent 404s
                    const callId = data.call_id || data.data?.call_id || data.data; // Handle various response formats

                    if (callId && typeof callId === 'string') {
                        // Find extension to link
                        // Find extension to link (optional)
                        const ext = await prisma.extension.findFirst({ where: { extensionId: caller } });

                        // Create Call Record (Always)
                        await prisma.call.create({
                            data: {
                                callId,
                                extensionId: ext?.id || null, // Can be null now
                                fromNumber: caller,
                                toNumber: callee,
                                direction: 'outbound',
                                status: 'calling',
                                startTime: new Date()
                            }
                        }).catch(e => console.error("Failed to create initial call record:", e));

                        // Only update extension status if it exists
                        if (ext) {
                            await prisma.extension.update({
                                where: { id: ext.id },
                                data: { status: 'calling' }
                            }).catch(e => console.error("Failed to update extension status:", e));
                        }
                    }

                    return NextResponse.json({
                        success: true,
                        data
                    });
                }

                // If interface doesn't exist, try next
                if (data.errcode === 10001) {
                    console.warn(`Endpoint ${endpoint} returned 10001 (Not Existed). Trying fallback...`);
                    lastError = new Error(`PBX API Error ${data.errcode}: ${data.errmsg}`);
                    continue;
                }

                // Other API error - stop and throw
                throw new Error(`PBX API Error ${data.errcode}: ${data.errmsg}`);

            } catch (error: any) {
                console.warn(`Failed attempt on ${endpoint}:`, error.message);
                lastError = error;
            }
        }

        // If we get here, all attempts failed
        throw lastError || new Error('Failed to connect to any PBX Dial endpoint');

    } catch (error: any) {
        console.error('Dial Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to initiate call' },
            { status: 500 }
        );
    }
}
