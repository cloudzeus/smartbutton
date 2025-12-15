import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Alert Recipients menu item...');

    // Find or create PBX menu group
    let pbxGroup = await prisma.menuGroup.findFirst({
        where: { name: 'PBX' }
    });

    if (!pbxGroup) {
        pbxGroup = await prisma.menuGroup.create({
            data: {
                name: 'PBX',
                label: 'PBX System',
                icon: 'Phone',
                order: 3
            }
        });
        console.log('✅ Created PBX menu group');
    }

    // Check if Alert Recipients menu item already exists
    const existing = await prisma.menuItem.findFirst({
        where: {
            name: 'Alert Recipients',
            menuGroupId: pbxGroup.id
        }
    });

    if (existing) {
        console.log('ℹ️ Alert Recipients menu item already exists');
        return;
    }

    // Get the highest order in PBX group
    const maxOrder = await prisma.menuItem.findFirst({
        where: { menuGroupId: pbxGroup.id },
        orderBy: { order: 'desc' },
        select: { order: true }
    });

    const newOrder = (maxOrder?.order ?? -1) + 1;

    // Create Alert Recipients menu item
    const menuItem = await prisma.menuItem.create({
        data: {
            name: 'Alert Recipients',
            label: 'Alert Recipients',
            path: '/dashboard/settings/pbx#alert-recipients',
            icon: 'Bell',
            menuGroupId: pbxGroup.id,
            order: newOrder
        }
    });

    console.log(`✅ Created Alert Recipients menu item (order: ${newOrder})`);

    // Create default permissions for all roles
    const roles = ['ADMIN', 'MANAGER', 'EMPLOYEE'];

    for (const role of roles) {
        const permissions = {
            ADMIN: { canView: true, canCreate: true, canEdit: true, canDelete: true },
            MANAGER: { canView: true, canCreate: true, canEdit: true, canDelete: false },
            EMPLOYEE: { canView: true, canCreate: false, canEdit: false, canDelete: false }
        };

        await prisma.rolePermission.upsert({
            where: {
                role_menuGroupId_menuItemId: {
                    role: role as any,
                    menuGroupId: pbxGroup.id,
                    menuItemId: menuItem.id
                }
            },
            update: permissions[role as keyof typeof permissions],
            create: {
                role: role as any,
                menuGroupId: pbxGroup.id,
                menuItemId: menuItem.id,
                ...permissions[role as keyof typeof permissions]
            }
        });

        console.log(`✅ Created ${role} permissions for Alert Recipients`);
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
