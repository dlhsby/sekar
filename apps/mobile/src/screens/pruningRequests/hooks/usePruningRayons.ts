/**
 * usePruningRayons — Fetch all rayons for form dropdown.
 */

import { useEffect, useState } from 'react';
import { getRayons } from '../../../services/api';

export function usePruningRayons() {
  const [rayons, setRayons] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getRayons();
        if (!cancelled && res.data) {
          setRayons(res.data.map((r: any) => ({ id: r.id, name: r.name })));
        }
      } catch {
        /* non-critical — fall back to user.rayon only */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { rayons };
}
