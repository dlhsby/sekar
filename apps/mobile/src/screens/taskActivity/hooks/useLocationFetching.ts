/**
 * Location (district & area) fetching hook for task creation
 */

import { useState, useEffect } from 'react';
import { getDistricts, getAreasByDistrictId } from '../../../services/api/districtsApi';
import type { NBSelectOption } from '../../../components/nb/NBSelect';

/**
 * Hook to manage district and area fetching
 */
export const useLocationFetching = (
  districtId: string,
  isDistrictFixed: boolean,
  isAreaFixed: boolean,
) => {
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
  const [districtOptions, setDistrictOptions] = useState<NBSelectOption[]>([]);
  const [areaOptions, setAreaOptions] = useState<NBSelectOption[]>([]);

  // Fetch districts for non-fixed roles
  useEffect(() => {
    if (isDistrictFixed) return;

    const fetchDistricts = async () => {
      setIsLoadingDistricts(true);
      try {
        const response = await getDistricts();
        if (response.data) {
          setDistrictOptions(
            response.data.map((r) => ({ label: r.name, value: r.id })),
          );
        }
      } catch {
        // Silently fail — user can retry
      } finally {
        setIsLoadingDistricts(false);
      }
    };

    fetchDistricts();
  }, [isDistrictFixed]);

  // Fetch areas when district changes (for non-area-fixed roles)
  useEffect(() => {
    if (isAreaFixed || !districtId) {
      if (!isAreaFixed) {
        setAreaOptions([]);
      }
      return;
    }

    const fetchAreas = async () => {
      setIsLoadingAreas(true);
      try {
        const response = await getAreasByDistrictId(districtId);
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
  }, [districtId, isAreaFixed]);

  return {
    isLoadingDistricts,
    isLoadingAreas,
    districtOptions,
    areaOptions,
  };
};
