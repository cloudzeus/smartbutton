import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Allow self-signed certificates in development for PBX connection
if (process.env.NODE_ENV === 'development') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

interface YeastarToken {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expire_time: number; // calculated timestamp
}

// In-memory token cache (in production, might want to use Redis or DB)
let apiTokenCache: YeastarToken | null = null;
let wsTokenCache: YeastarToken | null = null;

export async function getSettings() {
    let settings = await prisma.pBXSettings.findUnique({
        where: { name: 'default' },
    });

    if (!settings) {
        settings = await prisma.pBXSettings.findFirst({
            where: { isActive: true },
        });
    }

    if (!settings) throw new Error('PBX Settings not configured');
    return settings;
}

/**
 * Get Access Token for Yeastar API
 * Uses Client Credentials flow or Password flow depending on Yeastar version/config.
 * Based on Yeastar P-Series API docs.
 * @param type 'api' for general API calls, 'websocket' for Event Stream
 */
export async function getAccessToken(type: 'api' | 'websocket' = 'api'): Promise<string> {
    // Select cache based on type
    const cache = type === 'websocket' ? wsTokenCache : apiTokenCache;

    // Return cached token if valid (with 60s buffer)
    if (cache && cache.expire_time > Date.now() + 60000) {
        return cache.access_token;
    }

    const settings = await getSettings();
    // Check DB persistence layer if in-memory failed
    if (settings.accessToken && settings.tokenExpiry && settings.tokenExpiry.getTime() > Date.now() + 60000) {
        console.log('💾 Using persisted Access Token from DB');
        const dbToken: YeastarToken = {
            access_token: settings.accessToken,
            refresh_token: settings.refreshToken || '',
            expires_in: 0,
            expire_time: settings.tokenExpiry.getTime()
        };

        // Update in-memory cache
        if (type === 'websocket') wsTokenCache = dbToken;
        else apiTokenCache = dbToken;

        return settings.accessToken;
    }

    // 3. Try Refresh Token if available (and valid access token check failed)
    if (settings.refreshToken) {
        try {
            console.log('🔄 Attempting to refresh token using DB refresh_token...');
            const { pbxIp, pbxPort } = settings;
            // Provide protocol fallback or assume https for v1.0
            const refreshUrl = `https://${pbxIp}:${pbxPort}/openapi/v1.0/refresh_token`;

            const refreshRes = await fetch(refreshUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'OpenAPI'
                },
                body: JSON.stringify({ refresh_token: settings.refreshToken })
            });

            const refreshData = await refreshRes.json();

            if (refreshRes.ok && refreshData.errcode === 0) {
                console.log('✅ Token refreshed successfully');
                const newToken: YeastarToken = {
                    access_token: refreshData.access_token,
                    refresh_token: refreshData.refresh_token,
                    expires_in: refreshData.access_token_expire_time,
                    expire_time: Date.now() + (refreshData.access_token_expire_time * 1000)
                };

                // Update Cache
                if (type === 'websocket') wsTokenCache = newToken;
                else apiTokenCache = newToken;

                // Update DB
                try {
                    await prisma.pBXSettings.update({
                        where: { id: settings.id },
                        data: {
                            accessToken: newToken.access_token,
                            refreshToken: newToken.refresh_token,
                            tokenExpiry: new Date(newToken.expire_time)
                        }
                    });
                } catch (dbErr) {
                    console.error('Failed to update DB after refresh:', dbErr);
                }

                return newToken.access_token;
            }

            console.warn('⚠️ Token refresh failed (API error), falling back to full login. Response:', JSON.stringify(refreshData));
        } catch (err) {
            console.warn('⚠️ Token refresh error, falling back to full login:', err);
        }
    }

    const { pbxIp, pbxPort, clientId } = settings;

    // Determine Credentials
    // Uniformly use YEARSTAR_CLIENT_ID and YEARSTAR_CLIENT_SECRET for P-Series Authentication
    const finalClientId = process.env.YEARSTAR_CLIENT_ID || process.env.YEASTAR_CLIENT_ID || clientId || undefined;

    // For P-Series /get_token, we must use the Client Secret (Password)
    // The .env shows YEARSTAR_CLIENT_SECRET has the value user verified
    const clientSecret = process.env.YEARSTAR_CLIENT_SECRET || process.env.YEASTAR_CLIENT_SECRET || settings.clientSecret || undefined;

    console.log('🔑 Authenticating with Client ID and Secret');

    if (!finalClientId || !clientSecret) {
        throw new Error(`Client ID and Secret are required for ${type} access`);
    }

    // Construct URL - usually https://IP:PORT/openapi/v1.0/oauth/login
    // Note: Adjust protocol if using HTTP, but API usually requires HTTPS
    // Try HTTPS first, then HTTP
    const protocols = ['https', 'http'];

    let lastError: any = null;
    let loginData: any = null; // This will hold the successful login data or the last attempt's data

    for (const protocol of protocols) {
        // Skip HTTP on port 443 (standard HTTPS port) to avoid parsing garbage
        if (protocol === 'http' && pbxPort === '443') {
            continue;
        }

        const baseUrl = `${protocol}://${pbxIp}:${pbxPort}/openapi/v1.0`;
        let currentProtocolLoginData: any = { errcode: -1 }; // Data for current protocol attempt

        try {
            // 1. Try P-Series URL
            // Updated to use /get_token endpoint as per user configuration
            const pSeriesUrl = `${baseUrl}/get_token`;
            console.log(`Trying Auth URL: ${pSeriesUrl}`);
            let response;
            let text;
            try {
                response = await fetch(pSeriesUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'OpenAPI'
                    },
                    body: JSON.stringify({
                        username: finalClientId,
                        password: clientSecret
                    }),
                });

                text = await response.text();
                try {
                    currentProtocolLoginData = JSON.parse(text);
                } catch (jsonErr) {
                    // If JSON parse fails, it's likely an HTML error page or raw socket garbage
                    console.warn(`Response from ${pSeriesUrl} was not JSON. Preview: ${text.substring(0, 100)}...`);
                    throw jsonErr;
                }
            } catch (e) {
                console.warn(`Network/Parse error from ${pSeriesUrl} using ${protocol}:`, e);
                lastError = e;
                continue; // Try next protocol
            }

            // If P-Series worked (errcode 0), we have our token.
            if (currentProtocolLoginData.errcode === 0 && currentProtocolLoginData.access_token) {
                loginData = currentProtocolLoginData;
                break; // Stop protocol loop, we got a token
            }

            // If Interface Not Existed (10001) or other errors
            if (currentProtocolLoginData.errcode !== 0) {
                // CRITICAL: If IP is blocked, STOP IMMEDIATELY. Do not try other protocols.
                if (currentProtocolLoginData.errcode === 70004) {
                    console.error('🛑 FATAL: IP ADDRESS BLOCKED PERMANENTLY OR TEAMPORARILY.');
                    console.error('Response:', JSON.stringify(currentProtocolLoginData, null, 2));
                    throw new Error(`FATAL: ACCOUNT IP BLOCKED. Expires: ${currentProtocolLoginData.block_expire_time}. STOPPING ALL ATTEMPTS.`);
                }

                // CRITICAL FIX: If we are connecting for WebSocket, we MUST use P-Series API.
                // Falling back to V1.0/S-Series logic will fail anyway (no WebSocket support there)
                // and attempting it with ClientID/Secret often triggers "Password Error" -> IP BLOCK.
                if (type === 'websocket') {
                    console.error('🛑 PBX Auth Failed. Full Response:', JSON.stringify(currentProtocolLoginData, null, 2));
                    throw new Error(`P-Series API Error ${currentProtocolLoginData.errcode}: ${currentProtocolLoginData.errmsg}. Response: ${JSON.stringify(currentProtocolLoginData)}`);
                }
            }

            // If Interface Not Existed (10001), proceed with Fallbacks ONLY for generic API calls that might support legacy
            if (currentProtocolLoginData.errcode === 10001 || currentProtocolLoginData.status === undefined) {
                console.warn(`P-Series Login failed for ${protocol}. Response:`, JSON.stringify(currentProtocolLoginData));
                console.warn(`Proceeding to S-Series/V2 path...`);

                // --- Fallback Paths for THIS protocol ---
                try {
                    // V2
                    const v2Url = `${protocol}://${pbxIp}:${pbxPort}/api/v2.0/login`;
                    console.log(`Trying Auth URL: ${v2Url}`);
                    const r2 = await fetch(v2Url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: finalClientId, password: clientSecret }) });
                    const t2 = await r2.text();
                    try {
                        currentProtocolLoginData = JSON.parse(t2);
                    } catch { console.warn('V2 response not JSON'); }

                    // V1.1
                    if (currentProtocolLoginData.errcode === 10001 || (currentProtocolLoginData.status !== 'Success' && currentProtocolLoginData.response !== 'Success')) {
                        console.warn(`S-Series V2 failed. Response:`, JSON.stringify(currentProtocolLoginData));
                        console.log(`Trying V1.1 path...`);
                        const v1Url = `${protocol}://${pbxIp}:${pbxPort}/api/v1.1/login`;
                        const r1 = await fetch(v1Url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: finalClientId, password: clientSecret }) });
                        const t1 = await r1.text();
                        try {
                            currentProtocolLoginData = JSON.parse(t1);
                        } catch { console.warn('V1.1 response not JSON'); }
                    }

                    // V1.0 (MD5)
                    if (currentProtocolLoginData.errcode === 10001 || (currentProtocolLoginData.status !== 'Success' && currentProtocolLoginData.response !== 'Success')) {
                        console.warn(`S-Series V1.1 failed. Response:`, JSON.stringify(currentProtocolLoginData));
                        console.log(`Trying V1.0 path (MD5)...`);
                        const v10Url = `${protocol}://${pbxIp}:${pbxPort}/api/v1.0/login`;
                        const md5Pwd = crypto.createHash('md5').update(clientSecret).digest('hex');
                        const r10 = await fetch(v10Url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: finalClientId, password: md5Pwd }) });
                        const t10 = await r10.text();
                        try {
                            currentProtocolLoginData = JSON.parse(t10);
                        } catch { console.warn('V1.0 MD5 response not JSON'); }

                        // V1.0 Plain
                        if (currentProtocolLoginData.status !== 'Success' && currentProtocolLoginData.response !== 'Success') {
                            console.log(`V1.0 MD5 failed. Response:`, JSON.stringify(currentProtocolLoginData));
                            console.log('Trying V1.0 plain...');
                            const r10p = await fetch(v10Url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: finalClientId, password: clientSecret }) });
                            const t10p = await r10p.text();
                            try {
                                currentProtocolLoginData = JSON.parse(t10p);
                            } catch { console.warn('V1.0 Plain response not JSON'); }
                        }
                    }

                    // If any fallback succeeded, store it and break the protocol loop
                    if (currentProtocolLoginData.access_token || currentProtocolLoginData.token || currentProtocolLoginData.sessionid) {
                        loginData = currentProtocolLoginData;
                        break; // Stop protocol loop
                    }

                } catch (e) {
                    console.warn(`Fallbacks failed for ${protocol}:`, e);
                    lastError = e;
                }
            } else if (currentProtocolLoginData.errcode !== 0 && currentProtocolLoginData.errcode !== undefined) {
                // If we get specific auth error like 20002 from P-series, throw it clearly
                lastError = new Error(`API Error ${currentProtocolLoginData.errcode}: ${currentProtocolLoginData.errmsg}`);
                // If it's an auth error (20002), don't try other protocols, credentials are just wrong.
                break;
            }

        } catch (e) {
            console.warn(`Initial P-Series attempt failed for ${protocol}:`, e);
            lastError = e;
            // If caught specific logic error above, re-throw to abort
            if (e instanceof Error && e.message.includes('WebSocket requires P-Series API')) throw e;
        }
    } // End Protocol Loop

    // Process Final Result
    // If loginData is still null, it means no protocol attempt was successful
    if (!loginData) {
        throw new Error(`Auth failed after trying all protocols. Last Error: ${lastError?.message || JSON.stringify(lastError)}. Hint: Check PBX 'Integration -> API' settings, ensure API is Enabled, and Port is correct.`);
    }

    // Map S-Series token to our structure if it's an S-Series response
    if (loginData.status === 'Success' || loginData.response === 'Success') {
        loginData.access_token = loginData.token || loginData.sessionid;
        loginData.expires_in = 1800; // S-series often has fixed or shorter expiry
    }

    const token = loginData?.access_token || loginData?.token || loginData?.sessionid;
    if (!token) {
        throw new Error(`Auth failed. No access_token found in response. Last response: ${JSON.stringify(loginData)}.`);
    }

    const expiresIn = loginData.access_token_expire_time || loginData.expires_in || 3600;

    const newToken: YeastarToken = {
        access_token: token,
        refresh_token: loginData.refresh_token, // May be undefined for S-series
        expires_in: expiresIn,
        expire_time: Date.now() + (expiresIn * 1000),
    };

    // Update appropriate cache
    if (type === 'websocket') {
        wsTokenCache = newToken;
    } else {
        apiTokenCache = newToken;
    }

    // Persist to DB to survive restarts
    try {
        await prisma.pBXSettings.update({
            where: { id: settings.id },
            data: {
                accessToken: newToken.access_token,
                refreshToken: newToken.refresh_token,
                tokenExpiry: new Date(newToken.expire_time)
            }
        });
        console.log('💾 Token persisted to DB');
    } catch (e) {
        console.error('Failed to persist token to DB:', e);
    }

    return newToken.access_token;
}

/**
 * Create an Extension on Yeastar PBX
 */
export async function createYeastarExtension(data: {
    extension: string;
    type?: 'SIP' | 'IAX' | 'FXS'; // Default SIP
    email?: string;
    mobile_number?: string;
    user_name?: string;
    password?: string; // Registration password
}) {
    const settings = await getSettings();
    const token = await getAccessToken();

    const protocol = 'https';
    const baseUrl = `${protocol}://${settings.pbxIp}:${settings.pbxPort}/openapi/v1.0`;

    // Endpoint for creating extension: /extension/add (verify exact path in your docs version)
    const url = `${baseUrl}/extension/add?access_token=${encodeURIComponent(token)}`;

    const payload = {
        number: data.extension,
        type: data.type || 'SIP',
        username: data.user_name || data.extension,
        email: data.email || '',
        mobile_number: data.mobile_number || '',
        enable_password: 'on',
        password: data.password || data.extension // Default pwd same as ext
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'OpenAPI'
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Create Extension Failed: ${response.status} ${txt}`);
        }

        const resData = await response.json();
        if (resData.errcode !== 0) {
            throw new Error(`API Error ${resData.errcode}: ${resData.errmsg}`);
        }

        return resData;
    } catch (error) {
        console.error('Create Extension Error:', error);
        throw error;
    }
}

/**
 * Get List of Extensions from Yeastar PBX
 */
export async function getYeastarExtensions() {
    const settings = await getSettings();
    const token = await getAccessToken();

    const protocol = 'https';
    const baseUrl = `${protocol}://${settings.pbxIp}:${settings.pbxPort}/openapi/v1.0`;

    // Endpoint: /extension/list (GET) per documentation
    // Ref: https://help.yeastar.com/en/p-series-cloud-edition/developer-guide/query-extension-list.html

    let allExtensions: any[] = [];
    let pageNumber = 1;
    const pageSize = 1000;
    let totalNumber = 0;

    try {
        do {
            const url = `${baseUrl}/extension/list?access_token=${encodeURIComponent(token)}&page=${pageNumber}&page_size=${pageSize}`;

            console.log(`Fetching extensions page ${pageNumber}...`);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'OpenAPI'
                },
            });

            if (!response.ok) {
                throw new Error(`Fetch Extensions Failed: ${response.status}`);
            }

            const resData = await response.json();
            if (resData.errcode !== 0) {
                throw new Error(`API Error ${resData.errcode}: ${resData.errmsg}`);
            }

            const list = resData.data || resData.extension_list || resData.ext_list || [];
            allExtensions = allExtensions.concat(list);
            totalNumber = resData.total_number || 0;

            console.log(`Fetched ${list.length} extensions. Total: ${totalNumber}`);

            if (allExtensions.length >= totalNumber) break;
            pageNumber++;

            // Safety break
            if (pageNumber > 20) break;

        } while (allExtensions.length < totalNumber);

        return allExtensions;
    } catch (error) {
        console.error('Get Extensions Error:', error);
        throw error;
    }
}

/**
 * Get System Information from Yeastar PBX
 */
export async function getYeastarSystemInfo() {
    const settings = await getSettings();
    const token = await getAccessToken();

    const protocol = 'https';
    const baseUrl = `${protocol}://${settings.pbxIp}:${settings.pbxPort}/openapi/v1.0`;

    // Endpoint: /system/information (GET)
    const url = `${baseUrl}/system/information?access_token=${encodeURIComponent(token)}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'OpenAPI'
            },
        });

        if (!response.ok) {
            throw new Error(`Fetch System Info Failed: ${response.status}`);
        }

        const data = await response.json();
        if (data.errcode !== 0) {
            throw new Error(`API Error ${data.errcode}: ${data.errmsg}`);
        }

        return data;
    } catch (error) {
        console.error('Get System Info Error:', error);
        throw error;
    }
}
