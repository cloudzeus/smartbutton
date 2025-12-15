import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch all device alert recipients
export async function GET() {
    try {
        const recipients = await prisma.deviceAlertRecipient.findMany({
            orderBy: { order: 'asc' }
        });

        return NextResponse.json({
            success: true,
            recipients
        });
    } catch (error: any) {
        console.error('Error fetching device alert recipients:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// POST - Create new device alert recipient
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { number, label, type, notifyOnOffline, notifyOnLowBattery, batteryThreshold } = body;

        if (!number || !label) {
            return NextResponse.json(
                { success: false, error: 'Number and label are required' },
                { status: 400 }
            );
        }

        // Get the highest order number and add 1
        const maxOrder = await prisma.deviceAlertRecipient.findFirst({
            orderBy: { order: 'desc' },
            select: { order: true }
        });

        const newOrder = (maxOrder?.order ?? -1) + 1;

        const recipient = await prisma.deviceAlertRecipient.create({
            data: {
                number,
                label,
                type: type || 'EXTENSION',
                order: newOrder,
                notifyOnOffline: notifyOnOffline ?? true,
                notifyOnLowBattery: notifyOnLowBattery ?? true,
                batteryThreshold: batteryThreshold || 20
            }
        });

        return NextResponse.json({
            success: true,
            recipient
        });
    } catch (error: any) {
        console.error('Error creating device alert recipient:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// PUT - Update device alert recipient or reorder
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, reorderList } = body;

        // Handle bulk reordering
        if (reorderList && Array.isArray(reorderList)) {
            await Promise.all(
                reorderList.map((item: { id: string; order: number }) =>
                    prisma.deviceAlertRecipient.update({
                        where: { id: item.id },
                        data: { order: item.order }
                    })
                )
            );

            return NextResponse.json({
                success: true,
                message: 'Recipients reordered successfully'
            });
        }

        // Handle single recipient update
        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Recipient ID is required' },
                { status: 400 }
            );
        }

        const recipient = await prisma.deviceAlertRecipient.update({
            where: { id },
            data: body
        });

        return NextResponse.json({
            success: true,
            recipient
        });
    } catch (error: any) {
        console.error('Error updating device alert recipient:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// DELETE - Delete device alert recipient
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Recipient ID is required' },
                { status: 400 }
            );
        }

        await prisma.deviceAlertRecipient.delete({
            where: { id }
        });

        return NextResponse.json({
            success: true,
            message: 'Recipient deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting device alert recipient:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
