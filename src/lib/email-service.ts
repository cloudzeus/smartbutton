/**
 * Email notification service using Resend API
 */

interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
}

/**
 * Send email using Resend API
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        console.error('❌ RESEND_API_KEY not configured');
        return false;
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: options.from || 'Smart Button Alerts <alerts@yourdomain.com>',
                to: Array.isArray(options.to) ? options.to : [options.to],
                subject: options.subject,
                html: options.html
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('❌ Resend API error:', error);
            return false;
        }

        const data = await response.json();
        console.log('✅ Email sent:', data.id);
        return true;

    } catch (error) {
        console.error('❌ Error sending email:', error);
        return false;
    }
}

/**
 * Send alert for unassigned extensions
 */
export async function sendUnassignedExtensionsAlert(
    unassignedExtensions: Array<{ extensionId: string; name: string | null }>,
    recipientEmail: string
) {
    const extensionList = unassignedExtensions
        .map(ext => `<li><strong>Extension ${ext.extensionId}</strong>${ext.name ? ` - ${ext.name}` : ''}</li>`)
        .join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
        }
        .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .alert-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .extension-list {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .extension-list ul {
            list-style: none;
            padding: 0;
        }
        .extension-list li {
            padding: 10px;
            border-bottom: 1px solid #e5e7eb;
        }
        .extension-list li:last-child {
            border-bottom: none;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #6b7280;
            font-size: 14px;
        }
        .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Unassigned Extensions Alert</h1>
            <p>Smart Button System Notification</p>
        </div>
        <div class="content">
            <div class="alert-box">
                <strong>⚠️ Action Required</strong>
                <p>The following extensions do not have smart buttons assigned to them:</p>
            </div>

            <div class="extension-list">
                <h3>Unassigned Extensions (${unassignedExtensions.length})</h3>
                <ul>
                    ${extensionList}
                </ul>
            </div>

            <p>
                <strong>Why this matters:</strong><br>
                Guests in these rooms will not be able to use the smart button emergency alert system.
                Please assign smart buttons to these extensions as soon as possible.
            </p>

            <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/milesight/smart-buttons" class="button">
                    Assign Smart Buttons Now
                </a>
            </div>

            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                <strong>Next Steps:</strong>
            </p>
            <ol style="color: #6b7280; font-size: 14px;">
                <li>Go to Dashboard → Milesight Settings → Smart Buttons - Extensions</li>
                <li>Find the unassigned extensions in the list</li>
                <li>Use the dropdown to assign a smart button device to each extension</li>
                <li>Verify the assignment is saved</li>
            </ol>
        </div>
        <div class="footer">
            <p>
                This is an automated alert from your Smart Button System.<br>
                Generated on ${new Date().toLocaleString()}
            </p>
        </div>
    </div>
</body>
</html>
    `;

    return sendEmail({
        to: recipientEmail,
        subject: `⚠️ ${unassignedExtensions.length} Extension(s) Without Smart Buttons`,
        html
    });
}

/**
 * Send alert for offline devices
 */
export async function sendOfflineDevicesAlert(
    offlineDevices: Array<{ deviceName: string; deviceId: string }>,
    recipientEmail: string
) {
    const deviceList = offlineDevices
        .map(device => `<li><strong>${device.deviceName}</strong> (${device.deviceId})</li>`)
        .join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .alert-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .device-list { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .device-list ul { list-style: none; padding: 0; }
        .device-list li { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔴 Offline Devices Alert</h1>
            <p>Smart Button System Notification</p>
        </div>
        <div class="content">
            <div class="alert-box">
                <strong>🔴 Critical Alert</strong>
                <p>The following smart button devices are currently offline:</p>
            </div>
            <div class="device-list">
                <h3>Offline Devices (${offlineDevices.length})</h3>
                <ul>${deviceList}</ul>
            </div>
            <p><strong>Action Required:</strong> Check device connectivity and battery levels.</p>
        </div>
        <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
    `;

    return sendEmail({
        to: recipientEmail,
        subject: `🔴 ${offlineDevices.length} Smart Button Device(s) Offline`,
        html
    });
}
