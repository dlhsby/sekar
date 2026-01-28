'use client';

/**
 * Polygon Editor Component
 * Provides drawing and editing capabilities for area boundaries
 */

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Map } from './Map';
import { NBButton } from '@/components/nb';
import {
  calculatePolygonArea,
  formatArea,
  isValidPolygon,
  polygonToFeature,
  featureToPolygon,
} from '@/lib/utils/geo';
import { polygonColors } from '@/lib/maps/styles';
import type { MapStyle } from '@/lib/maps/styles';

export interface PolygonEditorProps {
  initialPolygon?: GeoJSON.Polygon;
  onChange: (polygon: GeoJSON.Polygon | null) => void;
  onAreaChange?: (areaMeters: number) => void;
  readonly?: boolean;
  center?: [number, number];
  zoom?: number;
  style?: MapStyle;
  className?: string;
}

export function PolygonEditor({
  initialPolygon,
  onChange,
  onAreaChange,
  readonly = false,
  center,
  zoom,
  style = 'streets',
  className = 'h-[600px]',
}: PolygonEditorProps) {
  const drawRef = useRef<MapboxDraw | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [currentPolygon, setCurrentPolygon] = useState<GeoJSON.Polygon | null>(
    initialPolygon || null
  );
  const [area, setArea] = useState<number>(0);
  const [mode, setMode] = useState<'view' | 'draw' | 'edit'>('view');

  // Calculate initial area
  useEffect(() => {
    if (initialPolygon && isValidPolygon(initialPolygon)) {
      const calculatedArea = calculatePolygonArea(initialPolygon);
      setArea(calculatedArea);
      if (onAreaChange) {
        onAreaChange(calculatedArea);
      }
    }
  }, [initialPolygon, onAreaChange]);

  // Handle map load
  const handleMapLoad = (map: mapboxgl.Map) => {
    mapRef.current = map;

    // Initialize Mapbox Draw
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: [
        // Polygon fill
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': polygonColors.fill,
            'fill-opacity': polygonColors.fillOpacity,
          },
        },
        // Polygon outline
        {
          id: 'gl-draw-polygon-stroke',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon']],
          paint: {
            'line-color': polygonColors.stroke,
            'line-width': polygonColors.strokeWidth,
          },
        },
        // Polygon vertices
        {
          id: 'gl-draw-polygon-vertex',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
          paint: {
            'circle-radius': 6,
            'circle-color': polygonColors.vertex,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        },
        // Active polygon
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
          paint: {
            'line-color': polygonColors.strokeActive,
            'line-width': polygonColors.strokeWidth,
          },
        },
        // Active vertex
        {
          id: 'gl-draw-polygon-vertex-active',
          type: 'circle',
          filter: [
            'all',
            ['==', 'meta', 'vertex'],
            ['==', '$type', 'Point'],
            ['==', 'active', 'true'],
          ],
          paint: {
            'circle-radius': 8,
            'circle-color': polygonColors.vertexActive,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        },
      ],
    });

    map.addControl(draw);
    drawRef.current = draw;

    // Load initial polygon if provided
    if (initialPolygon && isValidPolygon(initialPolygon)) {
      const feature = polygonToFeature(initialPolygon);
      draw.add(feature);
    }

    // Listen to draw events
    map.on('draw.create', handleDrawUpdate);
    map.on('draw.update', handleDrawUpdate);
    map.on('draw.delete', handleDrawUpdate);
  };

  // Handle draw updates
  const handleDrawUpdate = () => {
    if (!drawRef.current) return;

    const data = drawRef.current.getAll();
    if (data.features.length > 0) {
      const feature = data.features[0] as GeoJSON.Feature;
      const polygon = featureToPolygon(feature);

      if (polygon && isValidPolygon(polygon)) {
        setCurrentPolygon(polygon);
        onChange(polygon);

        const calculatedArea = calculatePolygonArea(polygon);
        setArea(calculatedArea);
        if (onAreaChange) {
          onAreaChange(calculatedArea);
        }
      }
    } else {
      setCurrentPolygon(null);
      onChange(null);
      setArea(0);
      if (onAreaChange) {
        onAreaChange(0);
      }
    }
  };

  // Enter draw mode
  const handleDrawPolygon = () => {
    if (!drawRef.current || readonly) return;

    // Clear existing polygons
    drawRef.current.deleteAll();
    drawRef.current.changeMode('draw_polygon');
    setMode('draw');
  };

  // Enter edit mode
  const handleEditPolygon = () => {
    if (!drawRef.current || readonly) return;

    const data = drawRef.current.getAll();
    if (data.features.length > 0) {
      const featureId = data.features[0].id as string;
      drawRef.current.changeMode('direct_select', { featureId });
      setMode('edit');
    }
  };

  // Delete polygon
  const handleDeletePolygon = () => {
    if (!drawRef.current || readonly) return;

    drawRef.current.deleteAll();
    setCurrentPolygon(null);
    onChange(null);
    setArea(0);
    if (onAreaChange) {
      onAreaChange(0);
    }
    setMode('view');
  };

  // Cancel drawing/editing
  const handleCancel = () => {
    if (!drawRef.current) return;

    drawRef.current.changeMode('simple_select');
    setMode('view');
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {!readonly && (
        <div className="flex items-center gap-3 flex-wrap">
          <NBButton
            onClick={handleDrawPolygon}
            variant={mode === 'draw' ? 'primary' : 'secondary'}
            size="sm"
            disabled={mode === 'draw'}
          >
            ✏️ {currentPolygon ? 'Gambar Ulang' : 'Gambar Polygon'}
          </NBButton>

          {currentPolygon && (
            <>
              <NBButton
                onClick={handleEditPolygon}
                variant={mode === 'edit' ? 'primary' : 'secondary'}
                size="sm"
                disabled={mode === 'edit'}
              >
                ✏️ Edit Polygon
              </NBButton>

              <NBButton
                onClick={handleDeletePolygon}
                variant="danger"
                size="sm"
              >
                🗑️ Hapus Polygon
              </NBButton>
            </>
          )}

          {mode !== 'view' && (
            <NBButton onClick={handleCancel} variant="secondary" size="sm">
              ✖️ Batal
            </NBButton>
          )}
        </div>
      )}

      {/* Area display */}
      {currentPolygon && area > 0 && (
        <div className="bg-amber-100 border-4 border-black p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="font-bold">Luas Area:</span>
            <span className="text-2xl font-black">{formatArea(area)}</span>
          </div>
        </div>
      )}

      {/* Map */}
      <Map
        center={center}
        zoom={zoom}
        style={style}
        className={className}
        onLoad={handleMapLoad}
      />

      {/* Instructions */}
      {!readonly && (
        <div className="bg-gray-100 border-4 border-black p-4 rounded-lg">
          <h4 className="font-bold mb-2">Petunjuk:</h4>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li>Klik tombol "Gambar Polygon" untuk mulai menggambar</li>
            <li>Klik pada peta untuk menambah titik polygon</li>
            <li>Klik titik pertama atau tekan Enter untuk menyelesaikan</li>
            <li>Klik "Edit Polygon" untuk mengubah titik yang sudah ada</li>
            <li>Minimal 3 titik untuk membuat polygon yang valid</li>
          </ul>
        </div>
      )}
    </div>
  );
}
