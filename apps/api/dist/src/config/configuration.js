"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    port: parseInt(process.env.PORT ?? '4000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    database: {
        url: process.env.DATABASE_URL,
    },
    frontendUrl: process.env.FRONTEND_URL,
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET,
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
    },
    messaging: {
        smtp: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT ?? '587', 10),
            user: process.env.SMTP_USER,
            password: process.env.SMTP_PASSWORD,
            fromEmail: process.env.SMTP_FROM_EMAIL ?? 'no-reply@autonexa.app',
            fromName: process.env.SMTP_FROM_NAME ?? 'AutoNexa',
        },
        twilio: {
            accountSid: process.env.TWILIO_ACCOUNT_SID,
            authToken: process.env.TWILIO_AUTH_TOKEN,
            fromNumber: process.env.TWILIO_FROM_NUMBER,
        },
        whatsapp: {
            accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
            phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        },
    },
    estimateApproval: {
        secret: process.env.ESTIMATE_APPROVAL_SECRET,
    },
    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    },
});
//# sourceMappingURL=configuration.js.map