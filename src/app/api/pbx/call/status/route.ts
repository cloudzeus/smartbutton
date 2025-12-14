import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const callId = searchParams.get('callId');

        if (!callId) {
            return NextResponse.json(
                { success: false, error: 'Missing callId parameter' },
                { status: 400 }
            );
        }

        const call = await prisma.call.findUnique({
            where: { callId },
            select: {
                status: true,
                startTime: true,
                answerTime: true,
                endTime: true,
                fromNumber: true,
                toNumber: true
            }
        });

        if (!call) {
            return NextResponse.json(
                { success: false, error: 'Call not found', status: 'unknown' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: call
        });

    } catch (error) {
        console.error('Error fetching call status:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
