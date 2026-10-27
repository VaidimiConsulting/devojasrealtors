/**
 * SMS SERVICE - REAL ESTATE MLM SYSTEM
 * --------------------------------------------------------------
 * Handles sending login credentials, OTPs, and notifications to
 * registered mobile numbers via configured SMS gateways (Fast2SMS, MSG91, Twilio)
 * or mock mode for safe development/testing.
 * --------------------------------------------------------------
 */
const https = require('https');
const http = require('http');
const { SmsLog } = require('../models');

// Determine if live provider is configured
const isLive = Boolean(process.env.SMS_API_KEY && process.env.SMS_API_KEY.trim() !== '');
const smsProvider = (process.env.SMS_PROVIDER || (isLive ? 'fast2sms' : 'mock')).toLowerCase();

// Clean and validate Indian 10-digit mobile number
const cleanPhoneNumber = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2))) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0') && /^[6-9]\d{9}$/.test(digits.slice(1))) {
    return digits.slice(1);
  }
  return null;
};

// Mask phone number for safe logging (e.g., "98****3210")
const maskPhone = (phone) => {
  const p = String(phone || '');
  if (p.length < 6) return '******';
  return `${p.slice(0, 2)}****${p.slice(-4)}`;
};

/**
 * Low-level HTTP POST request helper using standard Node https
 */
const postJson = (url, headers, payload) => {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const transport = isHttps ? https : http;

      const postData = JSON.stringify(payload);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          ...headers
        },
        timeout: 10000
      };

      const req = transport.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ statusCode: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ statusCode: res.statusCode, body: data });
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('SMS Gateway request timed out'));
      });

      req.write(postData);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Send Login Credentials SMS to a registered mobile number.
 * Password is NEVER logged in plaintext.
 *
 * @param {string} rawPhone - The registered person's mobile number
 * @param {string} loginId - e.g. DEV-0015
 * @param {string} temporaryPassword - Plain temporary password for one-time delivery
 * @param {number|null} userId - The registered user's ID
 */
const sendCredentialsSMS = async (rawPhone, loginId, temporaryPassword, userId = null) => {
  const phone = cleanPhoneNumber(rawPhone);
  if (!phone) {
    const errorMsg = `Invalid mobile number: ${rawPhone}. Must be a valid 10-digit Indian phone number.`;
    console.error(`[SMS Service] ${errorMsg}`);
    try {
      await SmsLog.create({
        user_id: userId,
        phone: String(rawPhone || 'UNKNOWN'),
        type: 'credentials',
        status: 'failed',
        provider: smsProvider,
        message_snippet: `Login ID: ${loginId} | [FAILED INVALID PHONE]`,
        error_message: errorMsg
      });
    } catch (e) { /* ignore log error */ }

    return {
      success: false,
      error: errorMsg,
      phone: rawPhone
    };
  }

  const messageText = `Welcome to Devojas Realtors! Your Login ID is ${loginId} and initial password is ${temporaryPassword}. Please login at https://devojasrealtors.in/login and change your password.`;
  const sanitizedSnippet = `Welcome to Devojas Realtors! Your Login ID is ${loginId} and initial password is [PROTECTED]. Please login...`;

  // ---------- MOCK / DEV MODE ----------
  if (!isLive || smsProvider === 'mock') {
    console.log(`[SMS MOCK] Credentials SMS delivered to registered mobile ${maskPhone(phone)} | Login ID: ${loginId}`);
    try {
      await SmsLog.create({
        user_id: userId,
        phone,
        type: 'credentials',
        status: 'mock_delivered',
        provider: 'mock',
        message_snippet: sanitizedSnippet,
        error_message: null
      });
    } catch (e) { /* ignore log error */ }

    return {
      success: true,
      mock: true,
      provider: 'mock',
      phone: maskPhone(phone),
      message: `SMS delivered in mock mode to ${maskPhone(phone)}`
    };
  }

  // ---------- LIVE GATEWAY DISPATCH ----------
  try {
    let result;
    if (smsProvider === 'fast2sms') {
      // Fast2SMS Quick Transactional Route
      result = await postJson('https://www.fast2sms.com/dev/bulkV2', {
        'authorization': process.env.SMS_API_KEY
      }, {
        route: process.env.SMS_ROUTE || 'q',
        message: messageText,
        language: 'english',
        flash: 0,
        numbers: phone
      });

      const body = result.body;
      const isSuccess = body && (body.return === true || body.status_code === 200);

      if (!isSuccess) {
        throw new Error(body?.message?.[0] || body?.message || 'Fast2SMS returned error');
      }
    } else if (smsProvider === 'msg91') {
      // MSG91 Flow / Transactional API
      result = await postJson('https://api.msg91.com/api/v5/flow/', {
        'authkey': process.env.SMS_API_KEY
      }, {
        template_id: process.env.SMS_TEMPLATE_ID || '',
        short_url: '0',
        recipients: [
          {
            mobiles: `91${phone}`,
            login_id: loginId,
            password: temporaryPassword
          }
        ]
      });

      const body = result.body;
      if (body && body.type === 'error') {
        throw new Error(body.message || 'MSG91 returned error');
      }
    } else {
      // Generic HTTP POST fallback if custom SMS_GATEWAY_URL provided
      if (process.env.SMS_GATEWAY_URL) {
        result = await postJson(process.env.SMS_GATEWAY_URL, {
          'Authorization': `Bearer ${process.env.SMS_API_KEY}`
        }, {
          phone,
          message: messageText,
          sender_id: process.env.SMS_SENDER_ID || 'DEVOJS'
        });
      } else {
        throw new Error(`Unsupported SMS provider: ${smsProvider}`);
      }
    }

    console.log(`[SMS Service] Credentials successfully sent to ${maskPhone(phone)} via ${smsProvider}`);
    try {
      await SmsLog.create({
        user_id: userId,
        phone,
        type: 'credentials',
        status: 'sent',
        provider: smsProvider,
        message_snippet: sanitizedSnippet,
        error_message: null
      });
    } catch (e) { /* ignore */ }

    return {
      success: true,
      mock: false,
      provider: smsProvider,
      phone: maskPhone(phone),
      message: `Credentials delivered successfully to ${maskPhone(phone)}`
    };
  } catch (gatewayErr) {
    console.error(`[SMS Service] Gateway failure sending to ${maskPhone(phone)}:`, gatewayErr.message);
    try {
      await SmsLog.create({
        user_id: userId,
        phone,
        type: 'credentials',
        status: 'failed',
        provider: smsProvider,
        message_snippet: sanitizedSnippet,
        error_message: gatewayErr.message
      });
    } catch (e) { /* ignore */ }

    return {
      success: false,
      mock: false,
      provider: smsProvider,
      phone: maskPhone(phone),
      error: `SMS Gateway failed: ${gatewayErr.message}`
    };
  }
};

/**
 * Send an OTP via SMS
 */
const sendOTP = async (rawPhone, otp) => {
  const phone = cleanPhoneNumber(rawPhone);
  if (!phone) {
    return { success: false, error: 'Invalid phone number' };
  }

  if (!isLive || smsProvider === 'mock') {
    console.log(`[SMS MOCK] OTP for ${maskPhone(phone)} is: ${otp}`);
    return { success: true, mock: true, message: `OTP logged in mock mode for ${maskPhone(phone)}` };
  }

  const message = `Your verification OTP for Devojas Realtors is: ${otp}. Valid for 10 minutes.`;
  try {
    if (smsProvider === 'fast2sms') {
      await postJson('https://www.fast2sms.com/dev/bulkV2', {
        'authorization': process.env.SMS_API_KEY
      }, {
        route: 'otp',
        variables_values: String(otp),
        numbers: phone
      });
    }
    return { success: true, mock: false };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  sendCredentialsSMS,
  sendOTP,
  cleanPhoneNumber,
  maskPhone,
  isLive,
  smsProvider
};
