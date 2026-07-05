/**
 * PlantStatusChip
 * Displays plant health status for pruning tasks
 * Phase 3 3-8: Plant due-date forecast
 */

import React, { useEffect, useState } from 'react';
import { getAreaPlantStatus } from '../../../services/api/monitoringApi';
import { NBText } from '../../../components/nb';

interface PlantStatusChipProps {
  areaId: string;
  taskTitle: string;
}

export function PlantStatusChip({ areaId, taskTitle }: PlantStatusChipProps): React.JSX.Element | null {
  const [statusEmoji, setStatusEmoji] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Check if this is likely a pruning task by title keywords
  const isPruningTask = taskTitle.toLowerCase().includes('prun') || taskTitle.toLowerCase().includes('pemangkas');

  useEffect(() => {
    if (!areaId || !isPruningTask) {
      return;
    }

    let mounted = true;

    const fetchStatus = async () => {
      setLoading(true);
      try {
        const response = await getAreaPlantStatus(areaId);
        if (mounted && response.data && response.data.totals) {
          // Show status summary: prioritize overdue > due_soon > ok > unknown
          const { ok, due_soon, overdue, unknown } = response.data.totals;

          if (overdue > 0) {
            setStatusEmoji(`🌱 ${overdue} overdue`);
          } else if (due_soon > 0) {
            setStatusEmoji(`🌿 ${due_soon} due soon`);
          } else if (ok > 0) {
            setStatusEmoji(`✅ ${ok} ok`);
          } else if (unknown > 0) {
            setStatusEmoji(`❓ ${unknown} unknown`);
          }
        }
      } catch {
        // Silently fail on plant status fetch
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchStatus();

    return () => {
      mounted = false;
    };
  }, [areaId, isPruningTask]);

  if (!statusEmoji || loading) {
    return null;
  }

  return (
    <NBText variant="caption" color="gray600">
      {statusEmoji}
    </NBText>
  );
}
