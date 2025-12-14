
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getYeastarExtensions } from '@/lib/yeastar-api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        // 1. Fetch from PBX
        const pbxExtensions = await getYeastarExtensions();

        if (!Array.isArray(pbxExtensions)) {
            throw new Error('Invalid response format from PBX');
        }

        let syncedCount = 0;
        let createdCount = 0;

        // 2. Sync to DB
        for (const pbxExt of pbxExtensions) {
            const extensionId = pbxExt.number;
            const name = pbxExt.caller_id_name || pbxExt.user_name || extensionId;
            const email = pbxExt.email_addr || null;
            const mobileNumber = pbxExt.mobile_number || null;
            const presenceStatus = pbxExt.presence_status || null;

            // Determine status
            let status = 'offline';
            if (pbxExt.online_status?.sip_phone?.status === 1) {
                status = 'online';
            } else if (pbxExt.online_status?.linkus_desktop?.status === 1 ||
                pbxExt.online_status?.linkus_mobile?.status === 1 ||
                pbxExt.online_status?.linkus_web?.status === 1) {
                status = 'online';
            }

            const existing = await prisma.extension.findUnique({
                where: { extensionId },
            });

            if (existing) {
                await prisma.extension.update({
                    where: { id: existing.id },
                    data: {
                        name,
                        email,
                        mobileNumber,
                        presenceStatus,
                        status,
                        lastSeen: new Date(),
                        isSynced: true
                    }
                });
                syncedCount++;
            } else {
                await prisma.extension.create({
                    data: {
                        extensionId,
                        name,
                        email,
                        mobileNumber,
                        presenceStatus,
                        sipUser: extensionId, // Default assumption
                        status,
                        isSynced: true
                    }
                });
                createdCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Sync complete. Updated ${syncedCount}, Created ${createdCount}.`,
            total: pbxExtensions.length
        });

    } catch (error: any) {
        console.error('Sync Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to sync extensions' },
            { status: 500 }
        );
    }
}
