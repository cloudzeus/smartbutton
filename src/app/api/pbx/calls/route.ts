import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const calls = await prisma.call.findMany({
            take: limit,
            skip: offset,
            orderBy: {
                startTime: 'desc'
            }
        });

        const total = await prisma.call.count();

        return NextResponse.json({
            success: true,
            data: calls,
            pagination: {
                total,
                limit,
                offset
            }
        });

    } catch (error) {
        console.error('Error fetching call history:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
