import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await auth();

        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { name, sipServer, sipUser, sipPassword } = body;

        const extension = await prisma.extension.update({
            where: { id: params.id },
            data: {
                name,
                sipServer,
                sipUser,
                sipPassword,
            },
        });

        return NextResponse.json({ success: true, extension });
    } catch (error) {
        console.error('Error updating extension:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update extension' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await auth();

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check if extension exists and its type
        const extension = await prisma.extension.findUnique({
            where: { id: params.id },
            select: { isSynced: true }
        });

        if (!extension) {
            return NextResponse.json(
                { success: false, error: 'Extension not found' },
                { status: 404 }
            );
        }

        // Logic: 
        // 1. If it is a synced PBX extension, ONLY ADMIN can delete.
        // 2. If it is a local Demo extension (isSynced=false), allow DELETE for authorized users (or Managers/Admins).
        // For now, we allow any authenticated user to delete their valid demo extensions if they have access to the dashboard.

        if (extension.isSynced && session.user.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Forbidden: Only Admins can delete PBX-synced extensions' },
                { status: 403 }
            );
        }

        // Use transaction to clean up related records first to avoid Foreign Key constraints
        await prisma.$transaction(async (tx) => {
            // 1. Delete CallEvents linked directly to this extension
            await tx.callEvent.deleteMany({ where: { extensionId: params.id } });

            // 2. Find Calls linked to this extension (as we need to delete their events too)
            const calls = await tx.call.findMany({
                where: { extensionId: params.id },
                select: { id: true }
            });

            const callIds = calls.map(c => c.id);

            if (callIds.length > 0) {
                // Delete events linked to these calls
                await tx.callEvent.deleteMany({ where: { callId: { in: callIds } } });
                // Delete the calls themselves
                await tx.call.deleteMany({ where: { id: { in: callIds } } });
            }

            // 3. Finally delete the extension
            await tx.extension.delete({
                where: { id: params.id },
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting extension:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete extension' },
            { status: 500 }
        );
    }
}
