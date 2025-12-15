import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Seed System View menu items
 * POST /api/seed/system-view-menu
 */
export async function POST() {
    try {
        console.log('🌱 Seeding System View menu item...');

        // 1. Find Dashboard menu group
        const dashboardGroup = await prisma.menuGroup.findFirst({
            where: { label: 'Dashboard' }
        });

        if (!dashboardGroup) {
            return NextResponse.json(
                { success: false, error: 'Dashboard menu group not found' },
                { status: 404 }
            );
        }

        // 2. Create System View menu item
        const systemViewItem = await prisma.menuItem.findFirst({
            where: {
                name: 'System View',
                menuGroupId: dashboardGroup.id
            }
        });

        if (!systemViewItem) {
            const newItem = await prisma.menuItem.create({
                data: {
                    name: 'System View',
                    label: 'System View',
                    path: '/dashboard/system-view',
                    icon: 'Server', // We'll need to make sure this icon is mapped in sidebar
                    menuGroupId: dashboardGroup.id,
                    order: 1 // Place it after Overview (order 0)
                }
            });

            // Create permissions for all roles
            const roles = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
            for (const role of roles) {
                const permissions = {
                    ADMIN: { canView: true, canCreate: false, canEdit: false, canDelete: false },
                    MANAGER: { canView: true, canCreate: false, canEdit: false, canDelete: false },
                    EMPLOYEE: { canView: true, canCreate: false, canEdit: false, canDelete: false }
                };

                await prisma.rolePermission.upsert({
                    where: {
                        role_menuGroupId_menuItemId: {
                            role: role as any,
                            menuGroupId: dashboardGroup.id,
                            menuItemId: newItem.id
                        }
                    },
                    update: permissions[role as keyof typeof permissions],
                    create: {
                        role: role as any,
                        menuGroupId: dashboardGroup.id,
                        menuItemId: newItem.id,
                        ...permissions[role as keyof typeof permissions]
                    }
                });
            }

            console.log('✅ Created System View menu item');
        } else {
            console.log('ℹ️ System View menu item already exists');
        }

        return NextResponse.json({
            success: true,
            message: 'System View menu item seeded successfully'
        });

    } catch (error: any) {
        console.error('❌ Error seeding menu items:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
