import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env explicitly since standalone script might not pick it up automatically
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.warn('⚠️ No .env file found at:', envPath);
}

const SERVER = process.env.MILESIGHT_SERVER_ADDRESS;
const CLIENT_ID = process.env.MILESIGHT_CLIENT_ID || process.env.MILSIGHT_CLIENT_ID;
const CLIENT_SECRET = process.env.MILESIGHT_CLIENT_SECRET;

console.log('--- Milesight Connection Test ---');
console.log('Server:', SERVER);
console.log('Client ID:', CLIENT_ID ? `${CLIENT_ID.substring(0, 5)}...` : 'MISSING');
console.log('Client Secret:', CLIENT_SECRET ? '******' : 'MISSING');

if (!SERVER || !CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Missing required environment variables.');
    process.exit(1);
}

async function testConnection() {
    try {
        console.log('\n1. Requesting Access Token...');
        const tokenUrl = `${SERVER}/oauth/token`;

        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', CLIENT_ID!);
        params.append('client_secret', CLIENT_SECRET!);

        const start = Date.now();
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        const duration = Date.now() - start;
        console.log(`   Response status: ${response.status} (${duration}ms)`);

        if (!response.ok) {
            const text = await response.text();
            console.error('❌ Auth Failed:', text);
            return;
        }

        const data = await response.json();
        console.log('   Response body:', JSON.stringify(data, null, 2));

        if (!data.access_token) {
            console.error('❌ No access_token in response!');
            return;
        }

        const token = data.access_token;
        console.log('✅ Token received successfully!');
        console.log(`   Token: ${token.substring(0, 20)}...`);

        console.log('\n2. Testing Device List API...');
        const devicesUrl = `${SERVER}/device-openapi/v1/devices?pageSize=1`;

        const listResponse = await fetch(devicesUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Response status: ${listResponse.status}`);

        if (!listResponse.ok) {
            const text = await listResponse.text();
            console.error('❌ Device List Failed:', text);
            return;
        }

        const listData = await listResponse.json();
        console.log('✅ Device list fetched successfully!');
        console.log('   Device count:', listData?.length || (Array.isArray(listData) ? listData.length : 'Unknown structure'));
        console.log('   Preview:', JSON.stringify(listData).substring(0, 100));

    } catch (error) {
        console.error('❌ Unexpected Error:', error);
    }
}

testConnection();
