import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Clean up duplicate/old menu items
 * DELETE /api/seed/milesight-menu
 */
export async function DELETE() {
    try {
        console.log('🧹 Cleaning up old menu items...');

        // Delete old menu groups with lowercase names (from original seed)
        const oldGroups = await prisma.menuGroup.findMany({
            where: {
                OR: [
                    { name: 'dashboard' },
                    { name: 'users-authentication' }
                ]
            },
            include: {
                menuItems: true
            }
        });

        for (const group of oldGroups) {
            // Delete menu items first
            await prisma.menuItem.deleteMany({
                where: { menuGroupId: group.id }
            });

            // Delete role permissions
            await prisma.rolePermission.deleteMany({
                where: { menuGroupId: group.id }
            });

            // Delete the group
            await prisma.menuGroup.delete({
                where: { id: group.id }
            });

            console.log(`✅ Deleted old menu group: ${group.name}`);
        }

        return NextResponse.json({
            success: true,
            message: `Cleaned up ${oldGroups.length} old menu groups`
        });

    } catch (error: any) {
        console.error('❌ Error cleaning up:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
