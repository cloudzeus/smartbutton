import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const eventType = searchParams.get('type');

        const where = eventType ? { eventType } : {};

        const events = await prisma.systemEvent.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: limit,
        });

        return NextResponse.json({
            success: true,
            events
        });
    } catch (error) {
        console.error('Error fetching events:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch events' },
            { status: 500 }
        );
    }
}
