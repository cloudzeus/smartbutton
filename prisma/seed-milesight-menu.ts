import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Milesight menu items...');

    // Create Milesight Settings menu group
    let milesightGroup = await prisma.menuGroup.findFirst({
        where: { name: 'Milesight Settings' }
    });

    if (!milesightGroup) {
        milesightGroup = await prisma.menuGroup.create({
            data: {
                name: 'Milesight Settings',
                label: 'Milesight Settings',
                icon: 'Smartphone',
                order: 4
            }
        });
        console.log('✅ Created Milesight Settings menu group');
    } else {
        console.log('ℹ️ Milesight Settings menu group already exists');
    }

    // Check if Smart Buttons menu item already exists
    const existing = await prisma.menuItem.findFirst({
        where: {
            name: 'Smart Buttons - Extensions',
            menuGroupId: milesightGroup.id
        }
    });

    if (existing) {
        console.log('ℹ️ Smart Buttons menu item already exists');
        return;
    }

    // Create Smart Buttons - Extensions menu item
    const menuItem = await prisma.menuItem.create({
        data: {
            name: 'Smart Buttons - Extensions',
            label: 'Smart Buttons - Extensions',
            path: '/dashboard/milesight/smart-buttons',
            icon: 'Smartphone',
            menuGroupId: milesightGroup.id,
            order: 0
        }
    });

    console.log('✅ Created Smart Buttons - Extensions menu item');

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

        console.log(`✅ Created ${role} permissions for Smart Buttons`);
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
