import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendUnassignedExtensionsAlert, sendOfflineDevicesAlert } from '@/lib/email-service';

/**
 * Check for unassigned extensions and send email alert
 * GET /api/alerts/unassigned-extensions?email=admin@hotel.com
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const recipientEmail = searchParams.get('email');
        const sendEmailAlert = searchParams.get('sendEmail') === 'true';

        if (sendEmailAlert && !recipientEmail) {
            return NextResponse.json(
                { success: false, error: 'Email address required when sendEmail=true' },
                { status: 400 }
            );
        }

        // Get all ROOM extensions (not ADMIN or OTHER)
        const allExtensions = await prisma.extension.findMany({
            where: {
                extensionType: 'ROOM' // Only check room extensions
            },
            select: {
                id: true,
                extensionId: true,
                name: true,
                roomNumber: true
            },
            orderBy: { extensionId: 'asc' }
        });

        // Get all devices with assigned extensions
        const devicesWithExtensions = await prisma.milesightDevice.findMany({
            where: {
                assignedExtensionId: { not: null }
            },
            select: {
                assignedExtensionId: true
            }
        });

        const assignedExtensionIds = new Set(
            devicesWithExtensions.map(d => d.assignedExtensionId).filter(Boolean)
        );

        // Find unassigned ROOM extensions
        const unassignedExtensions = allExtensions.filter(
            ext => !assignedExtensionIds.has(ext.id)
        );

        console.log(`📊 Room Extensions: ${allExtensions.length} total, ${unassignedExtensions.length} without smart buttons`);

        // Send email if requested
        let emailSent = false;
        if (sendEmailAlert && recipientEmail && unassignedExtensions.length > 0) {
            emailSent = await sendUnassignedExtensionsAlert(
                unassignedExtensions.map(ext => ({
                    extensionId: ext.extensionId,
                    name: ext.name
                })),
                recipientEmail
            );
        }

        return NextResponse.json({
            success: true,
            stats: {
                totalExtensions: allExtensions.length,
                assignedExtensions: allExtensions.length - unassignedExtensions.length,
                unassignedExtensions: unassignedExtensions.length
            },
            unassignedExtensions: unassignedExtensions.map(ext => ({
                extensionId: ext.extensionId,
                name: ext.name
            })),
            emailSent
        });

    } catch (error: any) {
        console.error('Error checking unassigned extensions:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * POST - Send alerts for both unassigned extensions and offline devices
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { recipientEmail, checkUnassigned, checkOffline } = body;

        if (!recipientEmail) {
            return NextResponse.json(
                { success: false, error: 'Recipient email is required' },
                { status: 400 }
            );
        }

        const results = {
            unassignedExtensions: null as any,
            offlineDevices: null as any,
            emailsSent: [] as string[]
        };

        // Check unassigned extensions
        if (checkUnassigned !== false) {
            const allExtensions = await prisma.extension.findMany({
                select: { id: true, extensionId: true, name: true }
            });

            const devicesWithExtensions = await prisma.milesightDevice.findMany({
                where: { assignedExtensionId: { not: null } },
                select: { assignedExtensionId: true }
            });

            const assignedExtensionIds = new Set(
                devicesWithExtensions.map(d => d.assignedExtensionId).filter(Boolean)
            );

            const unassignedExtensions = allExtensions.filter(
                ext => !assignedExtensionIds.has(ext.id)
            );

            results.unassignedExtensions = {
                count: unassignedExtensions.length,
                extensions: unassignedExtensions.map(ext => ({
                    extensionId: ext.extensionId,
                    name: ext.name
                }))
            };

            if (unassignedExtensions.length > 0) {
                const sent = await sendUnassignedExtensionsAlert(
                    unassignedExtensions.map(ext => ({
                        extensionId: ext.extensionId,
                        name: ext.name
                    })),
                    recipientEmail
                );

                if (sent) {
                    results.emailsSent.push('unassigned_extensions');
                }
            }
        }

        // Check offline devices
        if (checkOffline !== false) {
            const offlineDevices = await prisma.milesightDevice.findMany({
                where: {
                    isActive: false
                    // OR you can check attributes.connectStatus === 'OFFLINE'
                },
                select: {
                    deviceId: true,
                    deviceName: true,
                    attributes: true
                }
            });

            const actuallyOffline = offlineDevices.filter(
                d => d.attributes && (d.attributes as any).connectStatus === 'OFFLINE'
            );

            results.offlineDevices = {
                count: actuallyOffline.length,
                devices: actuallyOffline.map(d => ({
                    deviceId: d.deviceId,
                    deviceName: d.deviceName
                }))
            };

            if (actuallyOffline.length > 0) {
                const sent = await sendOfflineDevicesAlert(
                    actuallyOffline.map(d => ({
                        deviceId: d.deviceId,
                        deviceName: d.deviceName
                    })),
                    recipientEmail
                );

                if (sent) {
                    results.emailsSent.push('offline_devices');
                }
            }
        }

        return NextResponse.json({
            success: true,
            results,
            message: `Sent ${results.emailsSent.length} alert email(s)`
        });

    } catch (error: any) {
        console.error('Error sending alerts:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
