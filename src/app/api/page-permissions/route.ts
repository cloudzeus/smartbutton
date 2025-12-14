import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
    try {
        const session = await auth();

        // Allow all authenticated users to read permissions
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Get all page permissions from SystemEvent table (using it as a config store)
        const config = await prisma.systemEvent.findFirst({
            where: { eventType: 'PAGE_PERMISSIONS_CONFIG' },
            orderBy: { timestamp: 'desc' },
        });

        if (config && config.eventData) {
            return NextResponse.json({
                success: true,
                permissions: config.eventData
            });
        }

        return NextResponse.json({
            success: true,
            permissions: null
        });
    } catch (error) {
        console.error('Error fetching page permissions:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch permissions' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { permissions } = body;

        // Store permissions in SystemEvent table as config
        await prisma.systemEvent.create({
            data: {
                eventType: 'PAGE_PERMISSIONS_CONFIG',
                eventData: permissions,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Permissions saved successfully'
        });
    } catch (error) {
        console.error('Error saving page permissions:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save permissions' },
            { status: 500 }
        );
    }
}
