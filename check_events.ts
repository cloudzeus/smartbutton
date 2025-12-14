
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const events = await prisma.systemEvent.findMany({
        orderBy: { timestamp: 'desc' },
        take: 5
    })
    console.log('Recent System Events:')
    console.log(JSON.stringify(events, null, 2))
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
