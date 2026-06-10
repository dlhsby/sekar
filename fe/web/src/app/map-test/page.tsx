'use client';

/**
 * Isolated Mapbox smoke test — NO dashboard layout, auth, data, or shared CSS
 * chains. Visit /map-test. Renders a bare full-screen map and shows the token
 * status + any mapbox error on screen so we can see exactly what's wrong.
 *
 * Temporary diagnostic page — safe to delete once monitoring is confirmed.
 */
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function MapTestPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string[]>([]);

  const log = (m: string) => setStatus((s) => [...s, m]);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    log(`token present: ${!!token}`);
    log(`token prefix: ${token ? token.slice(0, 6) : '(none)'}  (should start with "pk.")`);
    log(`token length: ${token ? token.length : 0}`);

    if (!token || token === 'your-mapbox-token-here') {
      log('❌ NEXT_PUBLIC_MAPBOX_TOKEN is not set in the running server. Stop.');
      return;
    }
    if (!containerRef.current) {
      log('❌ container ref missing');
      return;
    }

    mapboxgl.accessToken = token;
    log('creating map…');

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [112.7508, -7.2575], // Surabaya
        zoom: 11,
      });
    } catch (e) {
      log(`❌ map ctor threw: ${(e as Error).message}`);
      return;
    }

    map.on('load', () => {
      log('✅ map "load" fired — base map is working');
      map.resize();
    });
    map.on('error', (e) => {
      // This is where a bad/restricted token (401/403) surfaces.
      log(`❌ map error: ${e.error?.message ?? JSON.stringify(e.error) ?? 'unknown'}`);
    });

    return () => map.remove();
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <pre
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 10,
          margin: 0,
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.95)',
          border: '2px solid #000',
          borderRadius: 6,
          font: '12px/1.5 monospace',
          maxWidth: '90vw',
          whiteSpace: 'pre-wrap',
        }}
      >
        {status.join('\n') || 'starting…'}
      </pre>
    </div>
  );
}
