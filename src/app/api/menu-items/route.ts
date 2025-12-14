import { NextResponse } from 'next/server';
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

        const menuItems = await prisma.menuItem.findMany({
            include: {
                menuGroup: {
                    select: {
                        name: true,
                        label: true,
                    },
                },
            },
            orderBy: [
                { menuGroup: { order: 'asc' } },
                { order: 'asc' },
            ],
        });

        return NextResponse.json({ success: true, menuItems });
    } catch (error) {
        console.error('Error fetching menu items:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch menu items' },
            { status: 500 }
        );
    }
}
