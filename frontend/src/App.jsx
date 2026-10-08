import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { ShieldCheck, Flame, Navigation, Clock } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './App.css';

// Fix standard Leaflet marker icons in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Hyderabad Test Coordinates (Charminar to SWCET)
const startCoords = [17.3616, 78.4747];
const endCoords = [17.3971, 78.4326];

const routeAPath = [
  [17.3616, 78.4747],
  [17.3710, 78.4650],
  [17.3820, 78.4510],
  [17.3971, 78.4326]
];

const routeBPath = [
  [17.3616, 78.4747],
  [17.3640, 78.4520],
  [17.3780, 78.4410],
  [17.3971, 78.4326]
];

export default function App() {
  const [selectedRoute, setSelectedRoute] = useState('B');
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylineARef = useRef(null);
  const polylineBRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Map once
    const map = L.map(mapContainerRef.current).setView([17.3793, 78.4536], 13);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Markers
    L.marker(startCoords).addTo(map).bindPopup('Origin: Charminar');
    L.marker(endCoords).addTo(map).bindPopup('Destination: SWCET');

    // Route Lines
    polylineARef.current = L.polyline(routeAPath, {
      color: '#ef4444',
      weight: 3,
      opacity: 0.7
    }).addTo(map);

    polylineBRef.current = L.polyline(routeBPath, {
      color: '#10b981',
      weight: 6,
      opacity: 0.95
    }).addTo(map);

    return () => {
      map.remove();
    };
  }, []);

  // Update line weights when active card is selected
  useEffect(() => {
    if (!polylineARef.current || !polylineBRef.current) return;

    if (selectedRoute === 'A') {
      polylineARef.current.setStyle({ weight: 6, opacity: 1.0 });
      polylineBRef.current.setStyle({ weight: 3, opacity: 0.5 });
    } else {
      polylineARef.current.setStyle({ weight: 3, opacity: 0.5 });
      polylineBRef.current.setStyle({ weight: 6, opacity: 1.0 });
    }
  }, [selectedRoute]);

  return (
    <div className="app-container">
      <header className="header">
        <h1>
          <Navigation size={22} color="#38bdf8" /> BreathRoute
        </h1>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          Real-time Low-Exposure Two-Wheeler Router
        </div>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <div className="comparison-banner">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f0fdf4' }}>
              37% Less Toxic Exposure
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#dcfce7', marginTop: '0.25rem' }}>
              By taking Route B, you avoid 3.3 minutes of traffic signal exhaust idling.
            </p>
          </div>

          <div
            className="card route-b"
            style={{
              cursor: 'pointer',
              outline: selectedRoute === 'B' ? '2px solid #10b981' : 'none'
            }}
            onClick={() => setSelectedRoute('B')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">Route B (BreathRoute Clean Bypass)</span>
              <span className="badge-clean">Recommended</span>
            </div>
            <div className="stat-val" style={{ color: '#10b981' }}>36.2 µg</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Estimated toxic inhaled particulate dose
            </div>
            <hr style={{ borderColor: '#334155', margin: '0.75rem 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span><Clock size={14} style={{ verticalAlign: 'middle' }} /> 14.4 mins</span>
              <span><ShieldCheck size={14} style={{ verticalAlign: 'middle', color: '#10b981' }} /> 0.9 min idling</span>
            </div>
          </div>

          <div
            className="card route-a"
            style={{
              cursor: 'pointer',
              outline: selectedRoute === 'A' ? '2px solid #ef4444' : 'none'
            }}
            onClick={() => setSelectedRoute('A')}
          >
            <div className="card-title">Route A (Standard Fastest / Signals)</div>
            <div className="stat-val" style={{ color: '#ef4444' }}>57.2 µg</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Estimated toxic inhaled particulate dose
            </div>
            <hr style={{ borderColor: '#334155', margin: '0.75rem 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span><Clock size={14} style={{ verticalAlign: 'middle' }} /> 12.0 mins</span>
              <span><Flame size={14} style={{ verticalAlign: 'middle', color: '#ef4444' }} /> 4.2 mins idling</span>
            </div>
          </div>
        </aside>

        <div className="map-wrapper" ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}