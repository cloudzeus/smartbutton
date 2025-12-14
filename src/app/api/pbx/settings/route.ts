import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
    try {
        const session = await auth();

        // if (!session || session.user.role !== 'ADMIN') {
        //     return NextResponse.json(
        //         { success: false, error: 'Unauthorized' },
        //         { status: 403 }
        //     );
        // }

        // Get the active PBX settings (priorimize default)
        let settings = await prisma.pBXSettings.findUnique({
            where: { name: 'default' },
        });

        if (!settings) {
            settings = await prisma.pBXSettings.findFirst({
                where: { isActive: true },
            });
        }

        return NextResponse.json({ success: true, settings });
    } catch (error) {
        console.error('Error fetching PBX settings:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch settings' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        // if (!session || session.user.role !== 'ADMIN') {
        //     return NextResponse.json(
        //         { success: false, error: 'Unauthorized' },
        //         { status: 403 }
        //     );
        // }

        const body = await request.json();
        const { pbxIp, pbxPort, clientId, clientSecret, websocketUrl, webhookSecret } = body;

        // Upsert settings (update if exists, create if not)
        const settings = await prisma.pBXSettings.upsert({
            where: { name: 'default' },
            update: {
                pbxIp,
                pbxPort,
                clientId,
                clientSecret,
                websocketUrl,
                webhookSecret,
                isActive: true,
            },
            create: {
                name: 'default',
                pbxIp,
                pbxPort,
                clientId,
                clientSecret,
                websocketUrl,
                webhookSecret,
                isActive: true,
            },
        });

        return NextResponse.json({
            success: true,
            settings,
            message: 'PBX settings saved successfully'
        });
    } catch (error) {
        console.error('Error saving PBX settings:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save settings' },
            { status: 500 }
        );
    }
}
