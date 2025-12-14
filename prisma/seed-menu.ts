import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedMenuItems() {
    console.log('Seeding menu items...')

    // Create Dashboard menu group
    const dashboardGroup = await prisma.menuGroup.upsert({
        where: { name: 'dashboard' },
        update: {},
        create: {
            name: 'dashboard',
            label: 'Dashboard',
            icon: 'LayoutDashboard',
            order: 0,
        },
    })

    await prisma.menuItem.upsert({
        where: { menuGroupId_name: { menuGroupId: dashboardGroup.id, name: 'overview' } },
        update: {},
        create: {
            menuGroupId: dashboardGroup.id,
            name: 'overview',
            label: 'Overview',
            path: '/dashboard',
            icon: 'Activity',
            order: 0,
        },
    })

    await prisma.menuItem.upsert({
        where: { menuGroupId_name: { menuGroupId: dashboardGroup.id, name: 'pbx-monitor' } },
        update: {},
        create: {
            menuGroupId: dashboardGroup.id,
            name: 'pbx-monitor',
            label: 'PBX Monitor',
            path: '/dashboard/pbx',
            icon: 'Phone',
            order: 1,
        },
    })

    // Create Users & Authentication menu group
    const usersGroup = await prisma.menuGroup.upsert({
        where: { name: 'users-authentication' },
        update: {},
        create: {
            name: 'users-authentication',
            label: 'Users & Authentication',
            icon: 'Shield',
            order: 1,
        },
    })

    await prisma.menuItem.upsert({
        where: { menuGroupId_name: { menuGroupId: usersGroup.id, name: 'user-management' } },
        update: {},
        create: {
            menuGroupId: usersGroup.id,
            name: 'user-management',
            label: 'User Management',
            path: '/dashboard/users',
            icon: 'Users',
            order: 0,
        },
    })

    await prisma.menuItem.upsert({
        where: { menuGroupId_name: { menuGroupId: usersGroup.id, name: 'role-management' } },
        update: {},
        create: {
            menuGroupId: usersGroup.id,
            name: 'role-management',
            label: 'Role Management',
            path: '/dashboard/roles',
            icon: 'Shield',
            order: 1,
        },
    })

    await prisma.menuItem.upsert({
        where: { menuGroupId_name: { menuGroupId: usersGroup.id, name: 'access-management' } },
        update: {},
        create: {
            menuGroupId: usersGroup.id,
            name: 'access-management',
            label: 'Access Management',
            path: '/dashboard/access',
            icon: 'Lock',
            order: 2,
        },
    })

    console.log('✅ Menu items seeded successfully')
}

seedMenuItems()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error('Error seeding menu items:', e)
        await prisma.$disconnect()
        process.exit(1)
    })
