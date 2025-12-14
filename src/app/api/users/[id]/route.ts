import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const { name, password, role } = body;

        const updateData: any = {
            name,
            role,
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update user' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const { id } = await params;

        // Prevent deleting yourself
        if (session.user.id === id) {
            return NextResponse.json(
                { success: false, error: 'Cannot delete your own account' },
                { status: 400 }
            );
        }

        await prisma.user.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete user' },
            { status: 500 }
        );
    }
}
