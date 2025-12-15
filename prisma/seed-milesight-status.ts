import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Adding Milesight Status menu item...');

    // Find Milesight Settings menu group
    const milesightGroup = await prisma.menuGroup.findFirst({
        where: { name: 'Milesight Settings' }
    });

    if (!milesightGroup) {
        console.error('❌ Milesight Settings menu group not found. Run seed-milesight-menu.ts first.');
        return;
    }

    // Check if Status menu item already exists
    const existing = await prisma.menuItem.findFirst({
        where: {
            name: 'Milesight Status',
            menuGroupId: milesightGroup.id
        }
    });

    if (existing) {
        console.log('ℹ️ Milesight Status menu item already exists');
        return;
    }

    // Create Milesight Status menu item
    const menuItem = await prisma.menuItem.create({
        data: {
            name: 'Milesight Status',
            label: 'Milesight Status',
            path: '/dashboard/milesight/status',
            icon: 'Activity',
            menuGroupId: milesightGroup.id,
            order: 1 // After Smart Buttons
        }
    });

    console.log('✅ Created Milesight Status menu item');

    // Create default permissions for all roles
    const roles = ['ADMIN', 'MANAGER', 'EMPLOYEE'];

    for (const role of roles) {
        const permissions = {
            ADMIN: { canView: true, canCreate: true, canEdit: true, canDelete: true },
            MANAGER: { canView: true, canCreate: false, canEdit: false, canDelete: false },
            EMPLOYEE: { canView: true, canCreate: false, canEdit: false, canDelete: false }
        };

        await prisma.rolePermission.upsert({
            where: {
                role_menuGroupId_menuItemId: {
                    role: role as any,
                    menuGroupId: milesightGroup.id,
                    menuItemId: menuItem.id
                }
            },
            update: permissions[role as keyof typeof permissions],
            create: {
                role: role as any,
                menuGroupId: milesightGroup.id,
                menuItemId: menuItem.id,
                ...permissions[role as keyof typeof permissions]
            }
        });

        console.log(`✅ Created ${role} permissions for Milesight Status`);
    }

    console.log('🎉 Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
