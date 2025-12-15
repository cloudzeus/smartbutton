import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMilesightDevices } from '@/lib/milesight-api';

/**
 * Sync devices from Milesight platform to local database
 * GET /api/milesight/devices/sync
 */
export async function POST() {
    try {
        console.log('🔄 Starting Milesight device sync...');

        let allDevices: any[] = [];
        let nextPageKey: string | undefined = undefined;
        let pageCount = 0;

        // Fetch all devices (handle pagination)
        do {
            const response = await getMilesightDevices({
                pageSize: 100,
                pageKey: nextPageKey
            });

            allDevices = allDevices.concat(response.list || []);
            nextPageKey = response.nextPageKey;
            pageCount++;

            console.log(`📄 Fetched page ${pageCount}, got ${response.list?.length || 0} devices`);

        } while (nextPageKey);

        console.log(`✅ Fetched total of ${allDevices.length} devices from Milesight`);

        // Sync devices to database
        let created = 0;
        let updated = 0;

        for (const device of allDevices) {
            try {
                const deviceData = {
                    deviceId: device.deviceId,
                    deviceName: device.name || device.sn || device.deviceId,
                    deviceType: device.deviceType || null,
                    deviceModel: device.model || null,
                    serialNumber: device.sn || null,
                    attributes: device as any, // Store full device object as JSON
                    lastSyncedAt: new Date(),
                    isActive: device.connectStatus === 'ONLINE'
                };

                const existing = await prisma.milesightDevice.findUnique({
                    where: { deviceId: device.deviceId }
                });

                if (existing) {
                    await prisma.milesightDevice.update({
                        where: { deviceId: device.deviceId },
                        data: deviceData
                    });
                    updated++;
                } else {
                    await prisma.milesightDevice.create({
                        data: deviceData
                    });
                    created++;
                }

            } catch (error) {
                console.error(`❌ Error syncing device ${device.deviceId}:`, error);
            }
        }

        console.log(`✅ Sync complete: ${created} created, ${updated} updated`);

        return NextResponse.json({
            success: true,
            message: 'Devices synced successfully',
            stats: {
                total: allDevices.length,
                created,
                updated
            }
        });

    } catch (error: any) {
        console.error('❌ Device sync error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * Get all synced devices
 * GET /api/milesight/devices
 */
export async function GET() {
    try {
        const devices = await prisma.milesightDevice.findMany({
            include: {
                assignedExtension: {
                    select: {
                        id: true,
                        extensionId: true,
                        name: true
                    }
                }
            },
            orderBy: { deviceName: 'asc' }
        });

        return NextResponse.json({
            success: true,
            devices
        });

    } catch (error: any) {
        console.error('Error fetching devices:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * Update device extension assignment
 * PUT /api/milesight/devices
 */
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { deviceId, assignedExtensionId } = body;

        if (!deviceId) {
            return NextResponse.json(
                { success: false, error: 'Device ID is required' },
                { status: 400 }
            );
        }

        const device = await prisma.milesightDevice.update({
            where: { deviceId },
            data: {
                assignedExtensionId: assignedExtensionId || null
            },
            include: {
                assignedExtension: {
                    select: {
                        id: true,
                        extensionId: true,
                        name: true
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            device
        });

    } catch (error: any) {
        console.error('Error updating device:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
