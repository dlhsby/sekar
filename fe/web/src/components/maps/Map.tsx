'use client';

/**
 * Base Map Component
 * Wraps Mapbox GL JS with React-friendly interface
 */

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { mapStyles, surabayaCenter, defaultZoom, type MapStyle } from '@/lib/maps/styles';

// Set Mapbox access token
if (typeof window !== 'undefined') {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (token && token !== 'your-mapbox-token-here') {
    mapboxgl.accessToken = token;
  }
}

export interface MapProps {
  center?: [number, number];
  zoom?: number;
  style?: MapStyle;
  className?: string;
  children?: (map: mapboxgl.Map) => React.ReactNode;
  onLoad?: (map: mapboxgl.Map) => void;
}

export function Map({
  center = surabayaCenter,
  zoom = defaultZoom,
  style = 'streets',
  className = '',
  children,
  onLoad,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Check if token is configured
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || token === 'your-mapbox-token-here') {
      setError('Mapbox token belum dikonfigurasi. Silakan tambahkan NEXT_PUBLIC_MAPBOX_TOKEN di .env.local');
      return;
    }

    try {
      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyles[style],
        center,
        zoom,
        attributionControl: false,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add attribution
      map.current.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        'bottom-right'
      );

      // Handle load event
      map.current.on('load', () => {
        setIsLoaded(true);
        if (map.current && onLoad) {
          onLoad(map.current);
        }
      });

      // Handle errors
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError('Gagal memuat peta. Periksa koneksi internet Anda.');
      });
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Gagal menginisialisasi peta');
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Only run once on mount

  // Update map style when style prop changes
  useEffect(() => {
    if (map.current && isLoaded) {
      map.current.setStyle(mapStyles[style]);
    }
  }, [style, isLoaded]);

  // Update center and zoom when props change
  useEffect(() => {
    if (map.current && isLoaded) {
      map.current.setCenter(center);
      map.current.setZoom(zoom);
    }
  }, [center, zoom, isLoaded]);

  // Error state
  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 border-4 border-black ${className}`}
      >
        <div className="text-center p-8">
          <div className="text-4xl mb-4">🗺️</div>
          <h3 className="font-bold text-lg mb-2">Error Memuat Peta</h3>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Map container */}
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />

      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 border-4 border-black rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent mb-4 mx-auto" />
            <p className="font-bold">Memuat peta...</p>
          </div>
        </div>
      )}

      {/* Children render function */}
      {isLoaded && map.current && children?.(map.current)}
    </div>
  );
}
