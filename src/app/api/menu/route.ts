import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Get all menu groups and items
 * GET /api/menu
 */
export async function GET() {
    try {
        const menuGroups = await prisma.menuGroup.findMany({
            where: { isActive: true },
            include: {
                menuItems: {
                    where: { isActive: true },
                    orderBy: { order: 'asc' }
                }
            },
            orderBy: { order: 'asc' }
        });

        return NextResponse.json({
            success: true,
            menuGroups
        });

    } catch (error: any) {
        console.error('Error fetching menu:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
