
import { prisma } from '../src/lib/prisma';
import { getAccessToken, getSettings } from '../src/lib/yeastar-api';

const targetNumber = process.argv[2];

if (!targetNumber) {
    console.error('Usage: npx ts-node scripts/test-alert-call.ts <target_number>');
    process.exit(1);
}

async function testCall() {
    try {
        console.log(`🧪 Testing Alert Call to ${targetNumber}...`);

        const settings = await getSettings();
        const token = await getAccessToken('api');
        const announcement = settings.smartButtonAnnouncement || 'alert';
        const permissionExt = settings.outboundPermissionExtension;

        console.log(`   - PBX: ${settings.pbxIp}`);
        console.log(`   - Prompt: ${announcement}`);
        console.log(`   - Permission Ext: ${permissionExt || 'None'}`);

        const url = `https://${settings.pbxIp}:${settings.pbxPort}/openapi/v1.0/call/play_prompt?access_token=${encodeURIComponent(token)}`;

        const payload: any = {
            number: targetNumber,
            prompts: [announcement],
            count: 1,
            auto_answer: 'no',
            volume: 20
        };

        if (permissionExt) {
            payload.dial_permission = permissionExt;
        }

        console.log('   - Payload:', JSON.stringify(payload));
        console.log('   📞 Sending Request...');

        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        console.log('   ✅ Response:', JSON.stringify(data, null, 2));

        if (data.errcode === 0) {
            console.log('   🎉 SUCCESS! The phone should be ringing.');
        } else {
            console.error('   ❌ FAILED:', data.errmsg);
        }

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

testCall();
