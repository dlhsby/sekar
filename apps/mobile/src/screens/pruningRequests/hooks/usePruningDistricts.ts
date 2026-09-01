/**
 * usePruningDistricts — Fetch all districts for form dropdown.
 */

import { useEffect, useState } from 'react';
import { getDistricts } from '../../../services/api';

export function usePruningDistricts() {
  const [districts, setDistricts] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getDistricts();
        if (!cancelled && res.data) {
          setDistricts(res.data.map((r: any) => ({ id: r.id, name: r.name })));
        }
      } catch {
        /* non-critical — fall back to user.district only */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { districts };
}
