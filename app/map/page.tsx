'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

type Road = {
  id: number;
  name: string;
  osm_id: string | null;
  highway: string | null;
  report_count: number;
  lat: number | null;
  lng: number | null;
};

type Report = {
  road_id: number;
};

function getColor(count: number): string {
  if (count === 0) return '#22c55e';
  if (count === 1) return '#84cc16';
  if (count === 2) return '#eab308';
  if (count === 3) return '#f97316';
  if (count >= 4) return '#ef4444';
  return '#22c55e';
}

function getStatus(count: number): string {
  if (count === 0) return 'Clear';
  if (count === 1) return 'Minor';
  if (count === 2) return 'Moderate';
  if (count === 3) return 'Serious';
  return 'Critical';
}

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [roads, setRoads] = useState<Road[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoad, setSelectedRoad] = useState<Road | null>(null);
  const [search, setSearch] = useState('');
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    async function loadData() {
      const { data: roadsData } = await supabase
        .from('roads')
        .select('id, name, osm_id, highway, lat, lng')
        .order('name')
        .range(0, 2000);

      const { data: reportsData } = await supabase
        .from('reports')
        .select('road_id');

      const reportCounts: Record<number, number> = {};
      (reportsData || []).forEach((r: Report) => {
        reportCounts[r.road_id] = (reportCounts[r.road_id] || 0) + 1;
      });

      const enriched = (roadsData || []).map((road: Omit<Road, 'report_count'>) => ({
        ...road,
        report_count: reportCounts[road.id] || 0,
      }));

      setRoads(enriched);
      setLoading(false);
      return enriched;
    }

    async function initMap() {
      if (!mapContainer.current) return;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-71.993, 43.648],
        zoom: 12,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', async () => {
        const enriched = await loadData();

        enriched.forEach((road) => {
          if (!road.lat || !road.lng || !map.current) return;

          const color = getColor(road.report_count);

          const el = document.createElement('div');
          el.style.cssText = `
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: ${color};
            border: 2px solid rgba(255,255,255,0.4);
            cursor: pointer;
            transition: transform 0.15s;
            box-shadow: 0 0 6px ${color}88;
          `;
          el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.8)'; });
          el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([road.lng, road.lat])
            .addTo(map.current!);

          el.addEventListener('click', () => setSelectedRoad(road));
          markersRef.current.push(marker);
        });
      });
    }

    initMap();

    return () => {
      map.current?.remove();
      markersRef.current = [];
    };
  }, []);

  const filteredRoads = roads.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const uniqueRoads = Object.values(
    filteredRoads.reduce((acc, road) => {
      const key = road.name.toLowerCase();
      if (!acc[key] || road.report_count > acc[key].report_count) {
        acc[key] = road;
      }
      return acc;
    }, {} as Record<string, Road>)
  ).sort((a, b) => b.report_count - a.report_count || a.name.localeCompare(b.name));

  function flyTo(road: Road) {
    if (!road.lat || !road.lng || !map.current) return;
    map.current.flyTo({ center: [road.lng, road.lat], zoom: 15, duration: 1000 });
    setSelectedRoad(road);
  }

  const stats = {
    clear: roads.filter(r => r.report_count === 0).length,
    minor: roads.filter(r => r.report_count === 1).length,
    moderate: roads.filter(r => r.report_count === 2).length,
    serious: roads.filter(r => r.report_count === 3).length,
    critical: roads.filter(r => r.report_count >= 4).length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0f', color: '#e2e8f0', fontFamily: "'DM Mono', monospace" }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e2330', display: 'flex', alignItems: 'center', gap: '16px', background: '#0d0f1a', flexShrink: 0 }}>
        <a href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px' }}>← Back</a>
        <span style={{ color: '#1e2330' }}>|</span>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em' }}>CANAAN ROAD WATCH</span>
        <span style={{ fontSize: '12px', color: '#22c55e', marginLeft: 'auto' }}>● LIVE MAP</span>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: '300px', flexShrink: 0, background: '#0d0f1a', borderRight: '1px solid #1e2330', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2330', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'Clear', count: stats.clear, color: '#22c55e' },
              { label: 'Minor', count: stats.minor, color: '#84cc16' },
              { label: 'Moderate', count: stats.moderate, color: '#eab308' },
              { label: 'Serious', count: stats.serious, color: '#f97316' },
              { label: 'Critical', count: stats.critical, color: '#ef4444' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: '11px', color: '#64748b' }}>{s.count} {s.label}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e2330' }}>
            <input
              placeholder="Search roads..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', background: '#151823', border: '1px solid #1e2330', borderRadius: '6px', padding: '7px 10px', color: '#e2e8f0', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '20px', color: '#64748b', fontSize: '12px', textAlign: 'center' }}>Loading roads...</div>
            ) : uniqueRoads.map(road => (
              <div
                key={road.id}
                onClick={() => flyTo(road)}
                style={{ padding: '10px 16px', borderBottom: '1px solid #111420', cursor: 'pointer', background: selectedRoad?.name === road.name ? '#151823' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#151823')}
                onMouseLeave={e => (e.currentTarget.style.background = selectedRoad?.name === road.name ? '#151823' : 'transparent')}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: getColor(road.report_count), flexShrink: 0, boxShadow: `0 0 5px ${getColor(road.report_count)}66` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{road.name}</div>
                  {road.highway && <div style={{ fontSize: '10px', color: '#475569', marginTop: '1px' }}>{road.highway}</div>}
                </div>
                <span style={{ fontSize: '10px', color: getColor(road.report_count), flexShrink: 0 }}>{getStatus(road.report_count)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

          {selectedRoad && (
            <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: '#0d0f1a', border: `1px solid ${getColor(selectedRoad.report_count)}44`, borderRadius: '10px', padding: '14px 20px', minWidth: '260px', boxShadow: `0 0 20px ${getColor(selectedRoad.report_count)}22` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: getColor(selectedRoad.report_count), boxShadow: `0 0 8px ${getColor(selectedRoad.report_count)}` }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{selectedRoad.name}</span>
                <button onClick={() => setSelectedRoad(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '16px' }}>×</button>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#64748b' }}>
                <span>Status: <span style={{ color: getColor(selectedRoad.report_count) }}>{getStatus(selectedRoad.report_count)}</span></span>
                <span>Reports: <span style={{ color: '#94a3b8' }}>{selectedRoad.report_count}</span></span>
                {selectedRoad.highway && <span>Type: <span style={{ color: '#94a3b8' }}>{selectedRoad.highway}</span></span>}
              </div>
            </div>
          )}

          <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(13,15,26,0.9)', border: '1px solid #1e2330', borderRadius: '8px', padding: '10px 14px', fontSize: '11px' }}>
            <div style={{ color: '#475569', marginBottom: '6px', letterSpacing: '0.08em' }}>ISSUE LEVEL</div>
            {[
              { label: 'Clear (0)', color: '#22c55e' },
              { label: 'Minor (1)', color: '#84cc16' },
              { label: 'Moderate (2)', color: '#eab308' },
              { label: 'Serious (3)', color: '#f97316' },
              { label: 'Critical (4+)', color: '#ef4444' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, boxShadow: `0 0 4px ${l.color}88` }} />
                <span style={{ color: '#94a3b8' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
