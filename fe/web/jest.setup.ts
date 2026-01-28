import '@testing-library/jest-dom';

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api/v1';
process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:3000';
process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-mapbox-token';
process.env.NEXT_PUBLIC_APP_NAME = 'SEKAR';
process.env.NEXT_PUBLIC_APP_VERSION = '2.0.0';
