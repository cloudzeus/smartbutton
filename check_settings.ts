
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Check what is actually in the DB
    const settings = await prisma.pBXSettings.findMany()
    console.log('--- DB DUMP: PBXSettings ---')
    console.log(JSON.stringify(settings, null, 2))

    // Verify what GET endpoint logic would find
    const defaultSetting = await prisma.pBXSettings.findUnique({
        where: { name: 'default' },
    });
    console.log('--- PREFERRED SETTING (default) ---')
    console.log(defaultSetting ? 'FOUND' : 'NOT FOUND')

    const anyActive = await prisma.pBXSettings.findFirst({
        where: { isActive: true },
    });
    console.log('--- FALLBACK SETTING (any active) ---')
    console.log(anyActive ? 'FOUND' : 'NOT FOUND')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
