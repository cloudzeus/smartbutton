
import { NextResponse } from 'next/server';
import { getYeastarSystemInfo } from '@/lib/yeastar-api';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const info = await getYeastarSystemInfo();
        return NextResponse.json({ success: true, info });
    } catch (error: any) {
        console.error('Error fetching PBX info:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch PBX info' },
            { status: 500 }
        );
    }
}
