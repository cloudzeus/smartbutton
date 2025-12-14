import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
    try {
        const session = await auth();

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Get PBX logs from SystemEvent table
        const events = await prisma.systemEvent.findMany({
            where: {
                eventType: {
                    in: ['PBX_LOG', 'PBX_ERROR', 'PBX_SUCCESS', 'PBX_WARNING', 'PBX_INFO']
                }
            },
            orderBy: {
                timestamp: 'desc'
            },
            take: 100,
        });

        const logs = events.map((event: any) => ({
            id: event.id,
            timestamp: event.timestamp.toISOString(),
            level: event.eventType.replace('PBX_', ''),
            category: event.eventData?.category || 'GENERAL',
            message: event.eventData?.message || 'No message',
            details: event.eventData?.details,
        }));

        return NextResponse.json({ success: true, logs });
    } catch (error) {
        console.error('Error fetching PBX logs:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch logs' },
            { status: 500 }
        );
    }
}

export async function DELETE() {
    try {
        const session = await auth();

        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Delete all PBX logs
        await prisma.systemEvent.deleteMany({
            where: {
                eventType: {
                    in: ['PBX_LOG', 'PBX_ERROR', 'PBX_SUCCESS', 'PBX_WARNING', 'PBX_INFO']
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error clearing PBX logs:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to clear logs' },
            { status: 500 }
        );
    }
}
