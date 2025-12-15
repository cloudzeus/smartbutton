import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch all alert recipients
export async function GET() {
    try {
        const recipients = await prisma.alertRecipient.findMany({
            orderBy: { order: 'asc' }
        });

        return NextResponse.json({
            success: true,
            recipients
        });
    } catch (error: any) {
        console.error('Error fetching alert recipients:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// POST - Create new alert recipient
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { number, label, type } = body;

        if (!number || !label) {
            return NextResponse.json(
                { success: false, error: 'Number and label are required' },
                { status: 400 }
            );
        }

        // Get the highest order number and add 1
        const maxOrder = await prisma.alertRecipient.findFirst({
            orderBy: { order: 'desc' },
            select: { order: true }
        });

        const newOrder = (maxOrder?.order ?? -1) + 1;

        const recipient = await prisma.alertRecipient.create({
            data: {
                number,
                label,
                type: type || 'EXTENSION',
                order: newOrder
            }
        });

        return NextResponse.json({
            success: true,
            recipient
        });
    } catch (error: any) {
        console.error('Error creating alert recipient:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// PUT - Update alert recipient or reorder
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, number, label, type, isActive, newOrder, reorderList } = body;

        // Handle bulk reordering
        if (reorderList && Array.isArray(reorderList)) {
            // Update order for multiple recipients
            await Promise.all(
                reorderList.map((item: { id: string; order: number }) =>
                    prisma.alertRecipient.update({
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

        const updateData: any = {};
        if (number !== undefined) updateData.number = number;
        if (label !== undefined) updateData.label = label;
        if (type !== undefined) updateData.type = type;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (newOrder !== undefined) updateData.order = newOrder;

        const recipient = await prisma.alertRecipient.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({
            success: true,
            recipient
        });
    } catch (error: any) {
        console.error('Error updating alert recipient:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// DELETE - Delete alert recipient
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

        await prisma.alertRecipient.delete({
            where: { id }
        });

        return NextResponse.json({
            success: true,
            message: 'Recipient deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting alert recipient:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
