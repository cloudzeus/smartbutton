import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
    try {
        // const session = await auth();

        // if (!session || session.user.role !== 'ADMIN') {
        //     return NextResponse.json(
        //         { success: false, error: 'Unauthorized' },
        //         { status: 403 }
        //     );
        // }

        // Test the connection using the configured settings/env variables
        // We import these dynamically to ensure they use the latest env vars
        const { getAccessToken, getYeastarExtensions } = await import('@/lib/yeastar-api');

        console.log('🧪 Starting PBX Connection Test...');

        // 1. Test Authentication (API Scope)
        const token = await getAccessToken('api');
        console.log('✅ Auth Token received:', token.substring(0, 10) + '...');

        // 2. Test Data Fetch (Extensions)
        const extensions = await getYeastarExtensions();
        console.log('✅ Extensions fetched:', extensions.length);

        return NextResponse.json({
            success: true,
            message: 'Successfully connected to PBX API',
            details: {
                tokenPreview: token.substring(0, 5) + '...',
                extensionCount: extensions.length,
                extensions: extensions.slice(0, 3) // Show first 3 for validation
            }
        });

    } catch (error) {
        console.error('Error testing PBX connection:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown Error',
                stack: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}
