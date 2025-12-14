import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting database seed...')

    // Create admin user
    const hashedPassword = await bcrypt.hash('1f1femsk', 10)

    const admin = await prisma.user.upsert({
        where: { email: 'gkozyris@aic.gr' },
        update: {},
        create: {
            email: 'gkozyris@aic.gr',
            name: 'Admin User',
            password: hashedPassword,
            role: 'ADMIN',
        },
    })

    console.log('✅ Admin user created:', admin.email)
    console.log('   Email: gkozyris@aic.gr')
    console.log('   Password: 1f1femsk')
    console.log('   Role: ADMIN')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error('Error during seed:', e)
        await prisma.$disconnect()
        process.exit(1)
    })
