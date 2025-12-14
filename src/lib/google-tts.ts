
import textToSpeech from '@google-cloud/text-to-speech';
import fs from 'fs';
import util from 'util';
import path from 'path';

// WARNING: You need GOOGLE_APPLICATION_CREDENTIALS json file or API key environment variable.
// User provided Client ID: 731146609186-ghsnej7js097u5n1rg4c3o5gvjrhbbla.apps.googleusercontent.com
// This is usually insufficient for backend API, but check if there's a way or if env is set.

const client = new textToSpeech.TextToSpeechClient({
    credentials: {
        client_email: process.env.GOOGLE_SA_CLIENT_EMAIL,
        private_key: (process.env.GOOGLE_SA_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }
});

export async function generateGreekAnnouncement(callerNumber: string): Promise<string | null> {
    try {
        const text = `Σας κάλεσε ο αριθμός ${callerNumber} κάτι συμβαίνει παρακαλώ κάντε έλεγχο`;

        const request = {
            input: { text: text },
            voice: { languageCode: 'el-GR', ssmlGender: 'FEMALE' as const },
            audioConfig: { audioEncoding: 'MP3' as const },
        };

        const [response] = await client.synthesizeSpeech(request);

        if (!response.audioContent) {
            throw new Error("No audio content received");
        }

        const fileName = `announcement-${callerNumber}-${Date.now()}.mp3`;
        const filePath = path.join(process.cwd(), 'public', 'prompts', fileName); // Save to public/prompts? Or just /tmp?

        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const writeFile = util.promisify(fs.writeFile);
        await writeFile(filePath, response.audioContent, 'binary');

        console.log(`Audio content written to file: ${filePath}`);

        // Return relative path or filename
        return fileName;

    } catch (error) {
        console.error("Google TTS Generation Failed:", error);
        return null;
    }
}
