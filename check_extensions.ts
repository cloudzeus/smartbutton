
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const extensions = await prisma.extension.findMany()
    console.log('Current Extensions in DB:')
    console.log(JSON.stringify(extensions, null, 2))
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
