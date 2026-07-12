/**
 * Location (rayon & location) fetching hook for task creation
 */

import { useState, useEffect } from 'react';
import { getRayons, getLocationsByRayonId } from '../../../services/api/rayonsApi';
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
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [rayonOptions, setRayonOptions] = useState<NBSelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<NBSelectOption[]>([]);

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

  // Fetch locations when rayon changes (for non-location-fixed roles)
  useEffect(() => {
    if (isAreaFixed || !rayonId) {
      if (!isAreaFixed) {
        setLocationOptions([]);
      }
      return;
    }

    const fetchLocations = async () => {
      setIsLoadingLocations(true);
      try {
        const response = await getLocationsByRayonId(rayonId);
        if (response.data) {
          setLocationOptions(
            response.data.map((a: any) => ({ label: a.name, value: a.id })),
          );
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoadingLocations(false);
      }
    };

    fetchLocations();
  }, [rayonId, isAreaFixed]);

  return {
    isLoadingRayons,
    isLoadingLocations,
    rayonOptions,
    locationOptions,
  };
};
