/**
 * App-singleton ConnectivityMonitor (Phase 4-2 M2).
 *
 * Constructed once at module load using the shared `API_BASE_URL`. App.tsx
 * imports this and starts it inside an effect; ConnectivityBanner subscribes.
 */
import config from '../../constants/config';
import { ConnectivityMonitor } from './connectivityStatus';

export const connectivityMonitor = new ConnectivityMonitor({
  healthUrl: `${config.API_BASE_URL}/health/ready`,
});
