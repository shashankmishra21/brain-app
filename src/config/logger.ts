import pino from 'pino';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }  // pretty print at dev
    : undefined,  // logs will be raw json
});

export default logger;