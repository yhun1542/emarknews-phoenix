const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

module.exports = {
    info: (msg, ...args) => logger.info(msg, ...args),
    error: (msg, ...args) => logger.error(msg, ...args),
    warn: (msg, ...args) => logger.warn(msg, ...args),
    debug: (msg, ...args) => logger.debug(msg, ...args)
};
