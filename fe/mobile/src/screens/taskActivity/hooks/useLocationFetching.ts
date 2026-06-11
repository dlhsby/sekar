/**
 * Location (rayon & area) fetching hook for task creation
 */

import { useState, useEffect } from 'react';
import { getRayons, getAreasByRayonId } from '../../../services/api/rayonsApi';
import type { NBSelectOption } from '../../../components/nb/NBSelect';

/**
 * Hook to manage rayon and area fetching
 */
export const useLocationFetching = (
  rayonId: string,
  isRayonFixed: boolean,
  isAreaFixed: boolean,
) => {
  const [isLoadingRayons, setIsLoadingRayons] = useState(false);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
  const [rayonOptions, setRayonOptions] = useState<NBSelectOption[]>([]);
  const [areaOptions, setAreaOptions] = useState<NBSelectOption[]>([]);

  // Fetch rayons for non-fixed roles
  useEffect(() => {
    if (isRayonFixed) return;

    const fetchRayons = async () => {
      setIsLoadingRayons(true);
      try {
        const response = await getRayons();
        if (response.data) {
          setRayonOptions(
            response.data.map((r) => ({ label: r.name, value: r.id })),
          );
        }
      } catch {
        // Silently fail — user can retry
      } finally {
        setIsLoadingRayons(false);
      }
    };

    fetchRayons();
  }, [isRayonFixed]);

  // Fetch areas when rayon changes (for non-area-fixed roles)
  useEffect(() => {
    if (isAreaFixed || !rayonId) {
      if (!isAreaFixed) {
        setAreaOptions([]);
      }
      return;
    }

    const fetchAreas = async () => {
      setIsLoadingAreas(true);
      try {
        const response = await getAreasByRayonId(rayonId);
        if (response.data) {
          setAreaOptions(
            response.data.map((a: any) => ({ label: a.name, value: a.id })),
          );
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoadingAreas(false);
      }
    };

    fetchAreas();
  }, [rayonId, isAreaFixed]);

  return {
    isLoadingRayons,
    isLoadingAreas,
    rayonOptions,
    areaOptions,
  };
};
