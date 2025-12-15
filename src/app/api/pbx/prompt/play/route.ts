import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, getSettings } from '@/lib/yeastar-api';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { extension, promptName = 'alert', autoAnswer = 'no', volume = 15 } = body;

        if (!extension) {
            return NextResponse.json(
                { success: false, error: 'Extension number is required' },
                { status: 400 }
            );
        }

        const settings = await getSettings();
        const token = await getAccessToken('api');

        // Yeastar P550 endpoint for playing prompts to an extension
        // Reference: /call/play_prompt
        const url = `https://${settings.pbxIp}:${settings.pbxPort}/openapi/v1.0/call/play_prompt?access_token=${encodeURIComponent(token)}`;

        const payload = {
            number: extension,           // Extension number to play prompt to
            prompts: [promptName],       // Array of prompt names (without file extension)
            count: 1,                    // Play once
            auto_answer: autoAnswer,     // Auto-answer if supported
            volume: volume               // Volume 0-20
        };

        console.log(`🔊 Playing prompt "${promptName}" to extension ${extension}`);

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
            console.error('Play prompt failed:', errorText);
            return NextResponse.json(
                { success: false, error: `Play prompt failed: ${response.status} ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        if (data.errcode === 0) {
            console.log(`✅ Prompt "${promptName}" played successfully to extension ${extension}`);
            return NextResponse.json({
                success: true,
                message: 'Prompt played successfully',
                data: data
            });
        } else {
            console.error('PBX API Error:', data);
            return NextResponse.json(
                { success: false, error: `PBX API Error ${data.errcode}: ${data.errmsg}` },
                { status: 400 }
            );
        }

    } catch (error: any) {
        console.error('Play Prompt Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to play prompt' },
            { status: 500 }
        );
    }
}
