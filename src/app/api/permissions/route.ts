import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
    try {
        const session = await auth();

        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const permissions = await prisma.rolePermission.findMany({
            orderBy: [
                { role: 'asc' },
            ],
        });

        return NextResponse.json({ success: true, permissions });
    } catch (error) {
        console.error('Error fetching permissions:', error);
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

        // Delete existing permissions and create new ones
        await prisma.rolePermission.deleteMany({});

        const validPermissions = permissions.filter(
            (p: any) => p.menuItemId && p.role
        );

        if (validPermissions.length > 0) {
            await prisma.rolePermission.createMany({
                data: validPermissions.map((p: any) => ({
                    role: p.role,
                    menuItemId: p.menuItemId,
                    canView: p.canView || false,
                    canCreate: p.canCreate || false,
                    canEdit: p.canEdit || false,
                    canDelete: p.canDelete || false,
                })),
                skipDuplicates: true,
            });
        }

        const updatedPermissions = await prisma.rolePermission.findMany();

        return NextResponse.json({
            success: true,
            permissions: updatedPermissions
        });
    } catch (error) {
        console.error('Error saving permissions:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save permissions' },
            { status: 500 }
        );
    }
}
