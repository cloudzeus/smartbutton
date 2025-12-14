import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const extensions = await prisma.extension.findMany({
            orderBy: { extensionId: 'asc' }
        });

        return NextResponse.json({
            success: true,
            extensions
        });
    } catch (error) {
        console.error('Error fetching extensions:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch extensions' },
            { status: 500 }
        );
    }
}

// ... imports
import { createYeastarExtension } from '@/lib/yeastar-api';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { extensionId, name, sipServer, sipUser, sipPassword, syncToPbx } = body;

        if (!extensionId) {
            return NextResponse.json(
                { success: false, error: 'Missing required field: extensionId' },
                { status: 400 }
            );
        }

        // 1. Optionally create on PBX first (if it fails, we abort local creation)
        if (syncToPbx) {
            try {
                await createYeastarExtension({
                    extension: extensionId,
                    user_name: name || extensionId,
                    password: sipPassword || extensionId,
                    // Additional fields can be mapped here
                });
                console.log(`✅ Extension ${extensionId} created on Yeastar PBX`);
            } catch (pbxError: any) {
                console.error('Failed to create extension on PBX:', pbxError);
                return NextResponse.json(
                    {
                        success: false,
                        error: `Failed to create on PBX: ${pbxError.message}. Check PBX Settings.`,
                        localSaved: false
                    },
                    { status: 502 }
                );
            }
        }

        // 2. Save in Local DB
        const extension = await prisma.extension.upsert({
            where: { extensionId },
            update: {
                name,
                sipServer,
                sipUser,
                sipPassword,
                lastSeen: new Date(),
                isSynced: !!syncToPbx
            },
            create: {
                extensionId,
                name,
                sipServer,
                sipUser,
                sipPassword,
                status: 'offline',
                isSynced: !!syncToPbx
            }
        });

        return NextResponse.json({
            success: true,
            extension,
            message: syncToPbx ? 'Created locally and on PBX' : 'Created locally'
        });
    } catch (error) {
        console.error('Error creating/updating extension:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create/update extension' },
            { status: 500 }
        );
    }
}
