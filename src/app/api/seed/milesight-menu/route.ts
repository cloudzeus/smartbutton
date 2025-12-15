import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Seed ALL menu items
 * POST /api/seed/milesight-menu
 */
export async function POST() {
    try {
        console.log('🌱 Seeding all menu items...');

        // Define all menu structure
        const menuStructure = [
            {
                group: { name: 'Dashboard', label: 'Dashboard', icon: 'LayoutDashboard', order: 0 },
                items: [
                    { name: 'Overview', label: 'Overview', path: '/dashboard', icon: 'Activity', order: 0 }
                ]
            },
            {
                group: { name: 'PBX Monitor', label: 'PBX Monitor', icon: 'Phone', order: 1 },
                items: [
                    { name: 'PBX Status', label: 'PBX Status', path: '/dashboard/pbx', icon: 'Activity', order: 0 },
                    { name: 'PBX Logs', label: 'PBX Logs', path: '/dashboard/pbx/logs', icon: 'FileText', order: 1 },
                    { name: 'Extensions', label: 'Extensions', path: '/dashboard/extensions', icon: 'Phone', order: 2 },
                    { name: 'Call History', label: 'Call History', path: '/dashboard/pbx/history', icon: 'History', order: 3 }
                ]
            },
            {
                group: { name: 'Users & Authentication', label: 'Users & Authentication', icon: 'Shield', order: 2 },
                items: [
                    { name: 'User Management', label: 'User Management', path: '/dashboard/users', icon: 'Users', order: 0 },
                    { name: 'Role Management', label: 'Role Management', path: '/dashboard/roles', icon: 'Shield', order: 1 },
                    { name: 'Access Management', label: 'Access Management', path: '/dashboard/access', icon: 'Lock', order: 2 }
                ]
            },
            {
                group: { name: 'Settings', label: 'Settings', icon: 'Settings', order: 3 },
                items: [
                    { name: 'PBX Settings', label: 'PBX Settings', path: '/dashboard/settings/pbx', icon: 'Phone', order: 0 }
                ]
            },
            {
                group: { name: 'Milesight Settings', label: 'Milesight Settings', icon: 'Smartphone', order: 4 },
                items: [
                    { name: 'Smart Buttons - Extensions', label: 'Smart Buttons - Extensions', path: '/dashboard/milesight/smart-buttons', icon: 'Smartphone', order: 0 },
                    { name: 'Milesight Status', label: 'Milesight Status', path: '/dashboard/milesight/status', icon: 'Activity', order: 1 }
                ]
            }
        ];

        let groupsCreated = 0;
        let itemsCreated = 0;

        for (const menuDef of menuStructure) {
            // Create or get menu group
            let group = await prisma.menuGroup.findFirst({
                where: { name: menuDef.group.name }
            });

            if (!group) {
                group = await prisma.menuGroup.create({
                    data: menuDef.group
                });
                groupsCreated++;
                console.log(`✅ Created menu group: ${group.name}`);
            } else {
                console.log(`ℹ️  Menu group exists: ${group.name}`);
            }

            // Create menu items
            for (const itemDef of menuDef.items) {
                const existing = await prisma.menuItem.findFirst({
                    where: {
                        name: itemDef.name,
                        menuGroupId: group.id
                    }
                });

                if (!existing) {
                    await prisma.menuItem.create({
                        data: {
                            ...itemDef,
                            menuGroupId: group.id
                        }
                    });
                    itemsCreated++;
                    console.log(`  ✅ Created menu item: ${itemDef.name}`);

                    // Create default permissions for all roles
                    const roles = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
                    for (const role of roles) {
                        const permissions = {
                            ADMIN: { canView: true, canCreate: true, canEdit: true, canDelete: true },
                            MANAGER: { canView: true, canCreate: true, canEdit: true, canDelete: false },
                            EMPLOYEE: { canView: true, canCreate: false, canEdit: false, canDelete: false }
                        };

                        const menuItem = await prisma.menuItem.findFirst({
                            where: { name: itemDef.name, menuGroupId: group.id }
                        });

                        if (menuItem) {
                            await prisma.rolePermission.upsert({
                                where: {
                                    role_menuGroupId_menuItemId: {
                                        role: role as any,
                                        menuGroupId: group.id,
                                        menuItemId: menuItem.id
                                    }
                                },
                                update: permissions[role as keyof typeof permissions],
                                create: {
                                    role: role as any,
                                    menuGroupId: group.id,
                                    menuItemId: menuItem.id,
                                    ...permissions[role as keyof typeof permissions]
                                }
                            });
                        }
                    }
                } else {
                    console.log(`  ℹ️  Menu item exists: ${itemDef.name}`);
                }
            }
        }

        // Get all menu groups and items for verification
        const allGroups = await prisma.menuGroup.findMany({
            include: {
                menuItems: {
                    orderBy: { order: 'asc' }
                }
            },
            orderBy: { order: 'asc' }
        });

        console.log(`🎉 Seeding complete! Created ${groupsCreated} groups and ${itemsCreated} items`);

        return NextResponse.json({
            success: true,
            message: `Seeded ${groupsCreated} menu groups and ${itemsCreated} menu items`,
            menuGroups: allGroups
        });

    } catch (error: any) {
        console.error('❌ Error seeding menu items:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * Get all menu groups and items
 * GET /api/seed/milesight-menu
 */
export async function GET() {
    try {
        const allGroups = await prisma.menuGroup.findMany({
            include: {
                menuItems: {
                    orderBy: { order: 'asc' }
                }
            },
            orderBy: { order: 'asc' }
        });

        return NextResponse.json({
            success: true,
            menuGroups: allGroups
        });

    } catch (error: any) {
        console.error('Error fetching menu groups:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
