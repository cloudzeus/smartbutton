
import { NextRequest, NextResponse } from 'next/server';
import { generateGreekAnnouncement } from '@/lib/google-tts';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const caller = searchParams.get('caller');

    if (!caller) {
        return NextResponse.json({ error: 'Caller number required' }, { status: 400 });
    }

    try {
        const fileName = await generateGreekAnnouncement(caller);

        if (!fileName) {
            return NextResponse.json({ error: 'TTS Generation Failed' }, { status: 500 });
        }

        const filePath = path.join(process.cwd(), 'public', 'prompts', fileName);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Audio file not found' }, { status: 404 });
        }

        // Return the file stream
        const fileBuffer = fs.readFileSync(filePath);

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': fileBuffer.length.toString(),
            },
        });

    } catch (error: any) {
        console.error("Announcement API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
