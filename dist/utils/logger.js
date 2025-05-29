"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = require("winston");
const { combine, timestamp, printf, errors } = winston_1.format;
// Custom format
const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${message}`;
    return `${timestamp} [${level}]: ${stack || message}`;
});
const logger = (0, winston_1.createLogger)({
    level: 'info',
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), // to log stack trace
    logFormat),
    transports: [
        new winston_1.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston_1.transports.File({ filename: 'logs/combined.log' })
    ]
});
// Log to console only in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston_1.transports.Console({
        format: winston_1.format.simple()
    }));
}
exports.default = logger;
