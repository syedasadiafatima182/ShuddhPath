import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  Navigation, Clock, ShieldCheck, Flame, MapPin, 
  LocateFixed, Search, AlertTriangle, Wind, Crosshair, Droplets
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './App.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createHazardIcon = (severity, statusLabel) => {
  let badgeColor = '#10b981';
  if (severity === 'HIGH') badgeColor = '#dc2626';
  else if (severity === 'MEDIUM') badgeColor = '#ea580c';

  const html = '<div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%);">' +
    '<span style="background:' + badgeColor + '; color:#fff; font-size:9px; font-weight:800; padding:2px 5px; border-radius:3px; box-shadow:0 2px 5px rgba(0,0,0,0.4); margin-bottom:2px; white-space:nowrap; letter-spacing:0.3px;">' + statusLabel + '</span>' +
    '<svg width="24" height="30" viewBox="0 0 24 24" fill="' + badgeColor + '" stroke="#fff" stroke-width="1.5">' +
    '<path d="M12 2L2 22h20L12 2z"></path>' +
    '<path d="M12 9v4" stroke="#fff" stroke-width="2" stroke-linecap="round"></path>' +
    '<circle cx="12" cy="17" r="1" fill="#fff"></circle>' +
    '</svg></div>';

  return L.divIcon({
    className: 'hazard-pin',
    html: html,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

const createCustomIcon = (type) => {
  const isStart = type === 'start';
  const color = isStart ? '#10b981' : '#ef4444';
  const label = isStart ? 'START' : 'STOP';

  const html = '<div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%); pointer-events:none;">' +
    '<span style="background:' + color + '; color:#ffffff; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px; letter-spacing:0.5px; box-shadow:0 2px 6px rgba(0,0,0,0.4); margin-bottom:2px; border:1px solid rgba(255,255,255,0.8);">' + label + '</span>' +
    '<svg width="28" height="36" viewBox="0 0 24 24" fill="' + color + '" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.5));">' +
    '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>' +
    '<circle cx="12" cy="10" r="3" fill="#ffffff"></circle>' +
    '</svg></div>';

  return L.divIcon({
    className: 'custom-map-pin',
    html: html,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

const startPinIcon = createCustomIcon('start');
const stopPinIcon = createCustomIcon('stop');

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [originText, setOriginText] = useState('');
  const [destText, setDestText] = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState('B');
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  const [pickingTarget, setPickingTarget] = useState(null);
  const [simulatedRain, setSimulatedRain] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerStartRef = useRef(null);
  const markerEndRef = useRef(null);
  const polylineARef = useRef(null);
  const polylineBRef = useRef(null);
  const hazardMarkersRef = useRef([]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Clean neutral view focused on Indian subcontinent
    const map = L.map(mapContainerRef.current).setView([20.5937, 78.9629], 5);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Hazard Pins on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    hazardMarkersRef.current.forEach(m => m.remove());
    hazardMarkersRef.current = [];

    const effectiveRainRate = simulatedRain !== null ? simulatedRain : (routeData?.livePrecipitationMm ?? 0.0);
    const isStressTest = effectiveRainRate >= 3.0;

    if (routeData?.hazards) {
      routeData.hazards.forEach(spot => {
        const severity = isStressTest ? 'HIGH' : spot.severity;
        const statusLabel = isStressTest ? 'SEVERE INUNDATION ALERT' : spot.statusLabel;
        const icon = createHazardIcon(severity, statusLabel);
        const marker = L.marker(spot.coords, { icon })
          .addTo(map)
          .bindPopup(
            '<div style="min-width: 190px;">' +
            '<b style="font-size:13px; color:#0f172a;">' + spot.name + '</b><br/>' +
            '<div style="font-size:11px; font-weight:700; margin:2px 0; color:' + (severity === 'HIGH' ? '#dc2626' : '#10b981') + '">' +
            'Status: ' + statusLabel + ' (' + effectiveRainRate + ' mm/h rain)' +
            '</div>' +
            '<p style="font-size:11px; color:#475569; margin:4px 0 0 0; line-height:1.35;">' + spot.description + '</p>' +
            '</div>'
          );
        hazardMarkersRef.current.push(marker);
      });
    }
  }, [routeData, simulatedRain]);

  // Click on map to place pin
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e) => {
      if (!pickingTarget) return;

      const { lat, lng } = e.latlng;
      const clicked = [parseFloat(lat.toFixed(4)), parseFloat(lng.toFixed(4))];

      if (pickingTarget === 'start') {
        setStartCoords(clicked);
        setOriginText('Map Pin (' + clicked[0] + ', ' + clicked[1] + ')');
        if (markerStartRef.current) markerStartRef.current.remove();
        markerStartRef.current = L.marker(clicked, { icon: startPinIcon })
          .addTo(map)
          .bindPopup('<b>Start</b>');
      } else if (pickingTarget === 'stop') {
        setEndCoords(clicked);
        setDestText('Map Pin (' + clicked[0] + ', ' + clicked[1] + ')');
        if (markerEndRef.current) markerEndRef.current.remove();
        markerEndRef.current = L.marker(clicked, { icon: stopPinIcon })
          .addTo(map)
          .bindPopup('<b>Destination</b>');
      }
      setPickingTarget(null);
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [pickingTarget]);

  const geocodeAddress = async (query) => {
    if (!query) return null;
    if (query.startsWith('Map Pin') || query.startsWith('Current Location')) {
      const match = query.match(/\(([^)]+)\)/);
      if (match) {
        const [lat, lon] = match[1].split(',').map(s => parseFloat(s.trim()));
        return [lat, lon];
      }
    }
    try {
      const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(query) + '&limit=1');
      const data = await res.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    setSearchError('');

    if (!originText.trim() || !destText.trim()) {
      setSearchError('Please provide both Start and Destination points.');
      return;
    }

    setLoading(true);

    const start = startCoords || await geocodeAddress(originText);
    const end = endCoords || await geocodeAddress(destText);

    if (!start || !end) {
      setSearchError('Could not locate one of the places. Enter a recognizable location or use "Pick on Map".');
      setLoading(false);
      return;
    }

    setStartCoords(start);
    setEndCoords(end);
    fetchRouteData(start, end);
  };

  const handleUseLiveLocation = () => {
    setSearchError('');
    if (!navigator.geolocation) {
      setSearchError('Geolocation not supported by browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const live = [parseFloat(pos.coords.latitude.toFixed(4)), parseFloat(pos.coords.longitude.toFixed(4))];
        setStartCoords(live);
        setOriginText('Current Location (' + live[0] + ', ' + live[1] + ')');
        setSearchError('');

        const map = mapInstanceRef.current;
        if (map) {
          map.setView(live, 13);
          if (markerStartRef.current) markerStartRef.current.remove();
          markerStartRef.current = L.marker(live, { icon: startPinIcon })
            .addTo(map)
            .bindPopup('<b>Current Location</b>');
        }
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setSearchError('Location access blocked. Allow permissions in browser address bar.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const fetchRouteData = async (start, end) => {
    if (!start || !end) return;
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, end })
      });
      const data = await res.json();
      setRouteData(data);

      const map = mapInstanceRef.current;
      if (!map) return;

      if (markerStartRef.current) markerStartRef.current.remove();
      markerStartRef.current = L.marker(start, { icon: startPinIcon })
        .addTo(map)
        .bindPopup('<b>Start:</b> ' + (originText || 'Selected Point'));

      if (markerEndRef.current) markerEndRef.current.remove();
      markerEndRef.current = L.marker(end, { icon: stopPinIcon })
        .addTo(map)
        .bindPopup('<b>Destination:</b> ' + (destText || 'Selected Point'));

      if (polylineARef.current) polylineARef.current.remove();
      polylineARef.current = L.polyline(data.routeA.path, {
        color: '#ef4444',
        weight: selectedRoute === 'A' ? 6 : 3,
        opacity: selectedRoute === 'A' ? 1.0 : 0.35
      }).addTo(map);

      if (polylineBRef.current) polylineBRef.current.remove();
      polylineBRef.current = L.polyline(data.routeB.path, {
        color: '#10b981',
        weight: selectedRoute === 'B' ? 6 : 3,
        opacity: selectedRoute === 'B' ? 1.0 : 0.35
      }).addTo(map);

      const bounds = L.latLngBounds([...data.routeA.path, ...data.routeB.path]);
      map.fitBounds(bounds, { padding: [50, 50] });

    } catch (err) {
      console.error('Backend fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startCoords && endCoords) {
      fetchRouteData(startCoords, endCoords);
    }
  }, [startCoords, endCoords]);

  const handleSelectRoute = (routeKey) => {
    setSelectedRoute(routeKey);
    if (!polylineARef.current || !polylineBRef.current) return;

    if (routeKey === 'A') {
      polylineARef.current.setStyle({ weight: 6, opacity: 1.0 });
      polylineBRef.current.setStyle({ weight: 3, opacity: 0.35 });
      polylineARef.current.bringToFront();
    } else {
      polylineBRef.current.setStyle({ weight: 6, opacity: 1.0 });
      polylineARef.current.setStyle({ weight: 3, opacity: 0.35 });
      polylineBRef.current.bringToFront();
    }
  };

  const isSimulated = simulatedRain !== null;
  const displayRain = isSimulated ? simulatedRain : (routeData?.livePrecipitationMm ?? 0.0);
  const liveAqi = routeData?.livePm25 ?? '--';
  const hazards = routeData?.hazards ?? [];

  const baseRouteA = routeData?.routeA;
  const baseRouteB = routeData?.routeB;

  const routeA = baseRouteA ? {
    ...baseRouteA,
    duration: isSimulated ? Math.round(baseRouteA.duration * 1.35) : baseRouteA.duration,
    idleMins: isSimulated ? Math.round(baseRouteA.idleMins * 1.8) : baseRouteA.idleMins,
    doseUg: isSimulated ? Math.round(baseRouteA.doseUg * 1.45) : baseRouteA.doseUg
  } : null;

  const routeB = baseRouteB;
  const savings = routeA && routeB && routeA.doseUg > 0
    ? Math.round(((routeA.doseUg - routeB.doseUg) / routeA.doseUg) * 100)
    : (routeData?.savingsPercent ?? 0);

  const timeDifference = routeA && routeB ? Math.max(0, Math.round(routeB.duration - routeA.duration)) : 0;

  const cleanOrigin = originText.split(',')[0].replace('Map Pin', 'Start');
  const cleanDest = destText.split(',')[0].replace('Map Pin', 'Destination');

  return (
    <div className="app-container">
      {showSplash && (
        <div className="splash-overlay">
          <div className="splash-content">
            <div className="splash-icon-wrapper">
              <Navigation size={42} color="#38bdf8" />
            </div>
            <h1 className="splash-title">ShuddhPath</h1>
            <p className="splash-subtitle">Real-Time Clean Air & Hazard Router</p>
          </div>
        </div>
      )}

      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Navigation size={24} color="#38bdf8" />
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            ShuddhPath
          </h1>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span>Live PM2.5: <strong style={{ color: '#38bdf8' }}>{liveAqi} {liveAqi !== '--' ? 'µg/m³' : ''}</strong></span>
          <span>
            Rain Rate: <strong style={{ color: displayRain > 0 ? '#38bdf8' : '#94a3b8' }}>
              {displayRain} mm/h {isSimulated ? '(Sim)' : ''}
            </strong>
          </span>
          <span style={{ background: '#1e293b', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #334155' }}>
            Multi-Hazard Router
          </span>
        </div>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          {/* Journey Inputs */}
          <form onSubmit={handleSearchSubmit} style={{ background: '#0f172a', padding: '0.85rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                Set Journey
              </span>
              <button
                type="button"
                onClick={handleUseLiveLocation}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <LocateFixed size={13} /> Use Live Location
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <label style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} color="#10b981" /> START / PICKUP
                  </label>
                  <button
                    type="button"
                    onClick={() => setPickingTarget(pickingTarget === 'start' ? null : 'start')}
                    style={{
                      background: pickingTarget === 'start' ? '#10b981' : '#1e293b',
                      border: '1px solid #334155',
                      color: pickingTarget === 'start' ? '#fff' : '#94a3b8',
                      fontSize: '0.7rem',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <Crosshair size={11} /> {pickingTarget === 'start' ? 'Click Map...' : 'Pick on Map'}
                  </button>
                </div>
                <input
                  type="text"
                  value={originText}
                  onChange={(e) => setOriginText(e.target.value)}
                  placeholder="Enter start address or city..."
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    padding: '0.45rem 0.6rem',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <label style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} color="#ef4444" /> STOP / DESTINATION
                  </label>
                  <button
                    type="button"
                    onClick={() => setPickingTarget(pickingTarget === 'stop' ? null : 'stop')}
                    style={{
                      background: pickingTarget === 'stop' ? '#ef4444' : '#1e293b',
                      border: '1px solid #334155',
                      color: pickingTarget === 'stop' ? '#fff' : '#94a3b8',
                      fontSize: '0.7rem',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <Crosshair size={11} /> {pickingTarget === 'stop' ? 'Click Map...' : 'Pick on Map'}
                  </button>
                </div>
                <input
                  type="text"
                  value={destText}
                  onChange={(e) => setDestText(e.target.value)}
                  placeholder="Enter destination address or city..."
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    padding: '0.45rem 0.6rem',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '0.3rem',
                  background: '#0284c7',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Search size={14} /> {loading ? 'Calculating...' : 'Find Cleaner Path'}
              </button>
            </div>

            {searchError && (
              <div style={{ color: '#f87171', fontSize: '0.72rem', marginTop: '0.4rem' }}>
                {searchError}
              </div>
            )}
          </form>

          {/* Interactive Simulation Mode Controls */}
          <div style={{
            background: '#0f172a',
            padding: '0.75rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid #1e293b'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Droplets size={15} color={displayRain > 0 ? '#38bdf8' : '#64748b'} />
                <span style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 600 }}>
                  Waterlog Hazard Mode
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => setSimulatedRain(null)}
                  style={{
                    background: !isSimulated ? '#0284c7' : '#1e293b',
                    color: !isSimulated ? '#fff' : '#94a3b8',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    fontSize: '0.68rem',
                    padding: '3px 8px',
                    cursor: 'pointer',
                    fontWeight: !isSimulated ? 700 : 400
                  }}
                >
                  Live Feed
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatedRain(15.0)}
                  style={{
                    background: isSimulated ? '#dc2626' : '#1e293b',
                    color: isSimulated ? '#fff' : '#94a3b8',
                    border: isSimulated ? '1px solid #ef4444' : '1px solid #334155',
                    borderRadius: '4px',
                    fontSize: '0.68rem',
                    padding: '3px 8px',
                    cursor: 'pointer',
                    fontWeight: isSimulated ? 700 : 600
                  }}
                >
                  ⛈️ Stress-Test Downpour
                </button>
              </div>
            </div>

            {hazards.length > 0 && (
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {hazards.map((h, i) => {
                  const sev = isSimulated ? 'HIGH' : h.severity;
                  const label = isSimulated ? 'SEVERE INUNDATION ALERT' : h.statusLabel;
                  return (
                    <div key={i} style={{
                      background: '#1e293b',
                      padding: '0.35rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ color: '#cbd5e1', fontWeight: 500 }}>{h.name}</span>
                      <span style={{
                        color: sev === 'HIGH' ? '#f87171' : '#34d399',
                        fontWeight: 700,
                        fontSize: '0.68rem'
                      }}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trade-off Banner (Only visible once a route is calculated) */}
          {routeData && (
            <div className="comparison-banner" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', padding: '0.85rem', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#f0fdf4', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Wind size={18} color="#34d399" /> {cleanOrigin} ➔ {cleanDest}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#dcfce7', marginTop: '0.35rem', lineHeight: '1.45' }}>
                <strong>Route A</strong> takes the direct arterial road, but traps you in stationary exhaust and {isSimulated ? 'waterlogged choke points' : 'bottleneck zones'}. 
                <strong> Route B</strong> adds ~{timeDifference} mins via cleaner corridors, cutting toxic particulate intake by <strong>{savings}%</strong>.
              </p>
            </div>
          )}

          {/* Route B Card */}
          {routeB && (
            <div
              className="card route-b"
              style={{
                cursor: 'pointer',
                border: selectedRoute === 'B' ? '2px solid #10b981' : '1px solid #334155',
                transform: selectedRoute === 'B' ? 'scale(1.01)' : 'none',
                transition: 'all 0.15s ease'
              }}
              onClick={() => handleSelectRoute('B')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-title" style={{ fontWeight: 700 }}>Route B (Clean Bypass)</span>
                <span className="badge-clean">Recommended</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.4rem' }}>
                <span className="stat-val" style={{ color: '#10b981', fontSize: '1.7rem', fontWeight: 800 }}>
                  {routeB.doseUg} µg
                </span>
                <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>toxic inhaled dose</span>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.2rem' }}>
                ✓ Continuous open airflow • avoids dense junction idling & flood chokes
              </div>

              <hr style={{ borderColor: '#334155', margin: '0.65rem 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#cbd5e1' }}>
                <span><Clock size={13} style={{ verticalAlign: 'middle', marginRight: '3px' }} /> {routeB.duration} mins</span>
                <span><Navigation size={13} style={{ verticalAlign: 'middle', marginRight: '3px' }} /> {routeB.distanceKm} km</span>
                <span><ShieldCheck size={13} style={{ verticalAlign: 'middle', color: '#10b981', marginRight: '3px' }} /> {routeB.idleMins} min idle</span>
              </div>
            </div>
          )}

          {/* Route A Card */}
          {routeA && (
            <div
              className="card route-a"
              style={{
                cursor: 'pointer',
                border: selectedRoute === 'A' ? '2px solid #ef4444' : '1px solid #334155',
                transform: selectedRoute === 'A' ? 'scale(1.01)' : 'none',
                transition: 'all 0.15s ease'
              }}
              onClick={() => handleSelectRoute('A')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-title" style={{ fontWeight: 700 }}>Route A (Shortest / Choked)</span>
                <span style={{ background: '#7f1d1d', color: '#fca5a5', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                  {isSimulated ? 'Flooded & High Inhalation' : 'High Inhalation'}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.4rem' }}>
                <span className="stat-val" style={{ color: '#ef4444', fontSize: '1.7rem', fontWeight: 800 }}>
                  {routeA.doseUg} µg
                </span>
                <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>toxic inhaled dose</span>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertTriangle size={12} /> {isSimulated ? 'Severe waterlogging stall on arterial low points' : 'High diesel tailpipe idling at signals & underpasses'}
              </div>

              <hr style={{ borderColor: '#334155', margin: '0.65rem 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#cbd5e1' }}>
                <span><Clock size={13} style={{ verticalAlign: 'middle', marginRight: '3px' }} /> {routeA.duration} mins</span>
                <span><Navigation size={13} style={{ verticalAlign: 'middle', marginRight: '3px' }} /> {routeA.distanceKm} km</span>
                <span><Flame size={13} style={{ verticalAlign: 'middle', color: '#ef4444', marginRight: '3px' }} /> {routeA.idleMins} min idle</span>
              </div>
            </div>
          )}
        </aside>

        <div className="map-wrapper" ref={mapContainerRef} style={{ height: '100%', width: '100%', flex: 1 }} />
      </div>
    </div>
  );
}