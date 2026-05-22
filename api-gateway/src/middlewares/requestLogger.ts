import morgan from 'morgan';

// Kısa format: method url status response-time ms
export const requestLogger = morgan(':method :url :status :response-time ms - :res[content-length]');
