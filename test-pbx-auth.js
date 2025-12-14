const https = require('https');

// Configurations - USER VERIFY THESE
const PBX_IP = 'https://allwan.ras.yeastar.com';
const PORT = '443';
const USERNAME = 'agjOWzvnjD7DmS1MMTeh4IWrGJY6SG1V';
const PASSWORD = 'QHU09RuCsZn8XmhIt5y8zqMYFU9UBqBf';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testAuth() {
    console.log('🧪 Testing Yeastar P-Series Auth...');
    console.log(`URL: ${PBX_IP}:${PORT}/openapi/v1.0/get_token`);
    console.log(`User: ${USERNAME}`);
    console.log(`Pass: ${PASSWORD.substring(0, 5)}...`);

    const url = `${PBX_IP}:${PORT}/openapi/v1.0/get_token`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: USERNAME,
                password: PASSWORD
            })
        });

        const text = await response.text();
        console.log(`Response Status: ${response.status}`);

        try {
            const json = JSON.parse(text);
            console.log('✅ Response JSON:', JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('❌ Response Text:', text);
        }

    } catch (error) {
        console.error('❌ Connection Error:', error.message);
    }
}

testAuth();
