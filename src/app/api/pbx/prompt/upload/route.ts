import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, getSettings } from '@/lib/yeastar-api';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

export async function POST(request: NextRequest) {
    try {
        const settings = await getSettings();
        const token = await getAccessToken('api');

        // Read the alert.mp3 file from public folder
        const filePath = path.join(process.cwd(), 'public', 'alert.mp3');

        if (!fs.existsSync(filePath)) {
            return NextResponse.json(
                { success: false, error: 'alert.mp3 file not found in public folder' },
                { status: 404 }
            );
        }

        const fileBuffer = fs.readFileSync(filePath);
        const fileStats = fs.statSync(filePath);

        // Create form data for file upload
        const formData = new FormData();
        formData.append('file', fileBuffer, {
            filename: 'alert.mp3',
            contentType: 'audio/mpeg',
            knownLength: fileStats.size
        });
        formData.append('type', 'custom'); // custom prompt type
        formData.append('name', 'alert'); // prompt name in PBX

        // Yeastar API endpoint for uploading custom prompts
        // Reference: /prompt/upload
        const url = `https://${settings.pbxIp}:${settings.pbxPort}/openapi/v1.0/prompt/upload?access_token=${encodeURIComponent(token)}`;

        console.log('📤 Uploading alert.mp3 to PBX...');

        const response = await fetch(url, {
            method: 'POST',
            headers: formData.getHeaders(),
            body: formData as any,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Upload failed:', errorText);
            return NextResponse.json(
                { success: false, error: `Upload failed: ${response.status} ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        if (data.errcode === 0) {
            console.log('✅ alert.mp3 uploaded successfully to PBX');
            return NextResponse.json({
                success: true,
                message: 'Audio file uploaded successfully',
                data: data
            });
        } else {
            console.error('PBX API Error:', data);
            return NextResponse.json(
                { success: false, error: `PBX API Error ${data.errcode}: ${data.errmsg}` },
                { status: 400 }
            );
        }

    } catch (error: any) {
        console.error('Upload Audio Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to upload audio file' },
            { status: 500 }
        );
    }
}
