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

interface MilesightDevice {
    deviceId: string;
    sn: string;
    devEUI?: string;
    imei?: string;
    model: string;
    deviceType: 'GATEWAY' | 'SUB_DEVICE' | 'COMMON';
    licenseStatus: 'VALID' | 'INVALID';
    connectStatus: 'ONLINE' | 'OFFLINE' | 'DISCONNECT';
    electricity?: number; // Battery level
    lastUpdateTime?: string;
    name: string;
    description?: string;
    project?: string;
    tag?: string[];
    mac?: string;
    wlanMac?: string;
    application?: {
        applicationId: string;
        applicationName: string;
    };
    firmwareVersion?: string;
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

        const responseData = await response.json();
        console.log('🔍 Raw Milesight Token Response:', JSON.stringify(responseData));

        // Milesight response can be wrapped in a 'data' object
        // structure: { status: "Success", data: { access_token: "...", expires_in: ... } }
        let tokenData = responseData;
        if (responseData.data && responseData.data.access_token) {
            tokenData = responseData.data;
        }

        if (!tokenData.access_token || typeof tokenData.access_token !== 'string') {
            throw new Error(`Invalid Milesight Token Response: Missing or invalid access_token. Received: ${JSON.stringify(responseData)}`);
        }

        // Cache token (expires in seconds, convert to milliseconds)
        cachedToken = tokenData.access_token;
        const expiresIn = tokenData.expires_in || 3600; // Default to 1 hour if missing
        tokenExpiry = Date.now() + (expiresIn * 1000) - 60000; // Refresh 1 min before expiry

        console.log('✅ Milesight token obtained, expires in', expiresIn, 'seconds');
        // Log first few chars to verify it's not empty/weird
        if (cachedToken) {
            console.log('🔑 Token preview:', cachedToken.substring(0, 10) + '...');
        }

        return cachedToken as string;

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
    let token = await getMilesightToken();

    const url = `${config.serverAddress}${endpoint}`;

    const makeRequest = async (authToken: string) => {
        return fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
    };

    let response = await makeRequest(token);

    // Handle 401: Token might be expired despite our local check
    // This can happen if the token was revoked server-side or our clock is off
    if (response.status === 401) {
        console.warn('⚠️ Milesight API returned 401 (Unauthorized). refreshing token and retrying...');

        // Clear cache to force a fresh token fetch
        cachedToken = null;
        tokenExpiry = null;

        try {
            // Get a fresh token
            const newToken = await getMilesightToken();

            // Retry the original request with the new token
            response = await makeRequest(newToken);

            if (response.ok) {
                console.log('✅ Retry successful after token refresh');
            }
        } catch (refreshError) {
            console.error('❌ Failed to refresh token during 401 handling:', refreshError);
            // Throw the original 401 or the new error? Throwing explicit error is better.
            throw new Error('Milesight API Authentication Failed: Session expired and could not be refreshed.');
        }
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Milesight API error: ${response.status} ${errorText}`);
    }

    return response.json();
}

/**
 * Search/Get all devices from Milesight platform
 * Uses: POST /device/openapi/v1/devices/search
 */
export async function getMilesightDevices(params?: {
    pageSize?: number;
    pageKey?: string;
    model?: string; // Filter by model (e.g., "WS101")
}): Promise<{ list: MilesightDevice[]; nextPageKey?: string; total?: number }> {
    const body: any = {};
    if (params?.pageSize) body.pageSize = params.pageSize;
    if (params?.pageKey /* or pageNumber */) body.pageNumber = parseInt(params.pageKey) || 1; // Map pageKey to pageNumber if needed, or use pageKey if API supports it. The curl used pageNumber.
    // Actually curl used "pageNumber": "1".
    // My code used pageKey. I'll support both or map them.

    // Check if params has pageKey/pageNumber
    // If user passes pageKey as a number string, use it as pageNumber
    if (params?.pageKey && !isNaN(parseInt(params.pageKey))) {
        body.pageNumber = parseInt(params.pageKey);
    }
    // If model filtering is needed, check API docs. Typically "model": "..." or in "filter".
    if (params?.model) body.model = params.model;

    // Default to pageSize 100 if not set, to get a good list
    const finalPageSize = body.pageSize || 100;
    const finalPageNumber = body.pageNumber || 1;

    // Milesight API often expects strings for these params (based on curl example)
    const requestBody = {
        ...body,
        pageSize: String(finalPageSize),
        pageNumber: String(finalPageNumber)
    };

    // Use usage of milesightRequest with POST
    const response = await milesightRequest('/device/openapi/v1/devices/search', {
        method: 'POST',
        body: JSON.stringify(requestBody)
    });

    console.log(`🔍 Device Search Response (Page ${body.pageNumber}):`, JSON.stringify(response).substring(0, 200));

    // Handle data wrapper
    const resultData = response.data || response;

    // Ensure list exists (API returns 'content' for search results)
    const list = resultData.content || resultData.list || [];
    const total = resultData.total || 0;

    // Calculate nextPageKey (next page number) if there are more items
    let nextPageKey: string | undefined = undefined;
    const currentCount = (body.pageNumber - 1) * body.pageSize + list.length;
    if (currentCount < total) {
        nextPageKey = (body.pageNumber + 1).toString();
    }

    return {
        list,
        total,
        nextPageKey
    };
}

/**
 * Get specific device details
 * Uses: GET /device/openapi/v1/devices/{deviceId}
 */
export async function getMilesightDevice(deviceId: string): Promise<MilesightDevice> {
    return milesightRequest(`/device/openapi/v1/devices/${deviceId}`);
}

/**
 * Get device configuration
 * Uses: GET /device/openapi/v1/devices/{deviceId}/config
 */
export async function getDeviceConfig(deviceId: string) {
    return milesightRequest(`/device/openapi/v1/devices/${deviceId}/config`);
}

/**
 * Get device TSL (Thing Specification Language) model
 * Defines what the device can report and configure
 * Uses: GET /device/openapi/v1/devices/{deviceId}/thing-specification
 */
export async function getDeviceTSL(deviceId: string) {
    return milesightRequest(`/device/openapi/v1/devices/${deviceId}/thing-specification`);
}

/**
 * Get device historical properties data
 * Uses: GET /device/openapi/v1/devices/{deviceId}/properties/history
 */
export async function getDeviceHistory(deviceId: string, params?: {
    startTime?: number;
    endTime?: number;
    pageSize?: number;
    nextPageKey?: string;
}) {
    const queryParams = new URLSearchParams();
    if (params?.startTime) queryParams.append('startTime', params.startTime.toString());
    if (params?.endTime) queryParams.append('endTime', params.endTime.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.nextPageKey) queryParams.append('nextPageKey', params.nextPageKey);

    const endpoint = `/device/openapi/v1/devices/${deviceId}/properties/history${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return milesightRequest(endpoint);
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

export type { MilesightDevice, MilesightConfig };
