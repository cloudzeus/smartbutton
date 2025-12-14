import { NextRequest, NextResponse } from 'next/server';
import { getYearstarClient } from '@/lib/yearstar-client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { from, to } = body;

        if (!from || !to) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: from, to' },
                { status: 400 }
            );
        }

        const client = getYearstarClient();

        if (!client.isConnected()) {
            return NextResponse.json(
                { success: false, error: 'Not connected to PBX' },
                { status: 503 }
            );
        }

        client.makeCall(from, to);

        return NextResponse.json({
            success: true,
            message: 'Call initiated',
            from,
            to
        });
    } catch (error) {
        console.error('Error making call:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to make call' },
            { status: 500 }
        );
    }
}
