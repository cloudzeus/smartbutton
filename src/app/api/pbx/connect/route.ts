import { NextRequest, NextResponse } from 'next/server';
import { getYearstarClient } from '@/lib/yearstar-client';

export async function POST(request: NextRequest) {
    try {
        const client = getYearstarClient();

        if (client.isConnected()) {
            return NextResponse.json({
                success: true,
                message: 'Already connected to PBX'
            });
        }

        await client.connect();

        return NextResponse.json({
            success: true,
            message: 'Connecting to PBX...'
        });
    } catch (error) {
        console.error('Error connecting to PBX:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to connect to PBX' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const client = getYearstarClient();
        const isConnected = client.isConnected();

        return NextResponse.json({
            success: true,
            connected: isConnected
        });
    } catch (error) {
        console.error('Error checking connection:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to check connection status' },
            { status: 500 }
        );
    }
}

export async function DELETE() {
    try {
        const client = getYearstarClient();
        client.disconnect();

        return NextResponse.json({
            success: true,
            message: 'Disconnected from PBX'
        });
    } catch (error) {
        console.error('Error disconnecting from PBX:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to disconnect from PBX' },
            { status: 500 }
        );
    }
}
