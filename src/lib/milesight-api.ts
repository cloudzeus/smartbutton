/**
 * Milesight API Client
 * Handles authentication and API calls to Milesight platform
 */

interface MilesightConfig {
    serverAddress: string;
    clientId: string;
    clientSecret: string;
}

interface MilesightTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * Get Milesight configuration from environment variables
 */
export function getMilesightConfig(): MilesightConfig {
    const serverAddress = process.env.MILESIGHT_SERVER_ADDRESS;
    const clientId = process.env.MILESIGHT_CLIENT_ID || process.env.MILSIGHT_CLIENT_ID; // Handle typo
    const clientSecret = process.env.MILESIGHT_CLIENT_SECRET;

    if (!serverAddress || !clientId || !clientSecret) {
        throw new Error('Missing Milesight configuration. Please set MILESIGHT_SERVER_ADDRESS, MILESIGHT_CLIENT_ID, and MILESIGHT_CLIENT_SECRET in .env');
    }

    return {
        serverAddress,
        clientId,
        clientSecret
    };
}

/**
 * Get access token for Milesight API
 * Caches token until expiry
 */
export async function getMilesightToken(): Promise<string> {
    // Return cached token if still valid
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    const config = getMilesightConfig();

    try {
        const response = await fetch(`${config.serverAddress}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: config.clientId,
                client_secret: config.clientSecret
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get Milesight token: ${response.status} ${errorText}`);
        }

        const data: MilesightTokenResponse = await response.json();

        // Cache token (expires in seconds, convert to milliseconds)
        cachedToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min before expiry

        console.log('✅ Milesight token obtained, expires in', data.expires_in, 'seconds');

        return cachedToken;

    } catch (error: any) {
        console.error('❌ Error getting Milesight token:', error);
        throw error;
    }
}

/**
 * Make authenticated request to Milesight API
 */
export async function milesightRequest(endpoint: string, options: RequestInit = {}) {
    const config = getMilesightConfig();
    const token = await getMilesightToken();

    const url = `${config.serverAddress}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Milesight API error: ${response.status} ${errorText}`);
    }

    return response.json();
}

/**
 * Get list of devices from Milesight
 */
export async function getMilesightDevices() {
    return milesightRequest('/api/v1/devices');
}

/**
 * Get device details
 */
export async function getMilesightDevice(deviceId: string) {
    return milesightRequest(`/api/v1/devices/${deviceId}`);
}

/**
 * Verify webhook signature (if Milesight provides one)
 * This is a placeholder - update based on Milesight's actual signature method
 */
export function verifyMilesightWebhook(payload: string, signature: string | null): boolean {
    if (!signature) {
        console.warn('⚠️ No webhook signature provided - skipping verification');
        return true; // Allow for now, but should be enforced in production
    }

    // TODO: Implement actual signature verification based on Milesight docs
    // Example:
    // const crypto = require('crypto');
    // const expectedSignature = crypto
    //     .createHmac('sha256', process.env.MILESIGHT_WEBHOOK_SECRET!)
    //     .update(payload)
    //     .digest('hex');
    // return signature === expectedSignature;

    return true;
}
