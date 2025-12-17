import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Get all extensions that either:
        // 1. Are of type ROOM, OR
        // 2. Have a Milesight device assigned (smart buttons)
        const rooms = await prisma.extension.findMany({
            where: {
                OR: [
                    { extensionType: 'ROOM' },
                    { milesightDevices: { some: {} } } // Has at least one device
                ]
            },
            select: {
                id: true,
                extensionId: true,
                name: true,
                status: true,
                roomNumber: true,
                extensionType: true, // Include type for debugging
                milesightDevices: {
                    select: {
                        id: true,
                        deviceName: true,
                        attributes: true, // Contains connectStatus like 'ONLINE'/'OFFLINE' and electricity
                        lastSyncedAt: true
                    },
                    take: 1 // Assuming 1 button per room usually
                }
            },
            orderBy: {
                roomNumber: 'asc'
            }
        });

        // Sort by room number numerically if possible, otherwise string sort
        const sortedRooms = rooms.sort((a: any, b: any) => {
            const numA = parseInt(a.roomNumber || '0');
            const numB = parseInt(b.roomNumber || '0');
            if (!isNaN(numA) && !isNaN(numB) && numA !== 0 && numB !== 0) {
                return numA - numB;
            }
            return (a.roomNumber || '').localeCompare(b.roomNumber || '');
        });

        return NextResponse.json({
            success: true,
            rooms: sortedRooms
        });

    } catch (error: any) {
        console.error('Error fetching system view data:', {
            message: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack
        });
        return NextResponse.json(
            { success: false, error: 'Failed to fetch system view data' },
            { status: 500 }
        );
    }
}
