import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const recipients = await prisma.alertRecipient.findMany({
            orderBy: { order: 'asc' }
        });

        const extensions = await prisma.extension.findMany({
            select: {
                extensionId: true,
                name: true,
                status: true,
                assignedDevice: {
                    select: {
                        deviceName: true,
                        serialNumber: true
                    }
                }
            }
        });

        return NextResponse.json({
            recipients,
            extensions,
            count: {
                recipients: recipients.length,
                activeRecipients: recipients.filter(r => r.isActive).length,
                extensions: extensions.length
            }
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}
