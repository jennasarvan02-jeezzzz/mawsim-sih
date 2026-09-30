'use client';
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import greatCircle from '@turf/great-circle';
import { point } from '@turf/helpers';
import { type Port } from '@/lib/freight';

// Fix for default Leaflet icon paths in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom ship icon for the route
const shipIcon = new L.DivIcon({
  html: '<div style="font-size: 20px; text-shadow: 0 0 5px rgba(0,0,0,0.5);">⛴️</div>',
  className: 'ship-icon',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function RealMap({ origin, dest }: { origin: Port | undefined; dest: Port | undefined }) {
  const [routeGeoJson, setRouteGeoJson] = useState<any>(null);

  useEffect(() => {
    if (origin && dest && origin.code !== dest.code) {
      // Calculate a beautiful great-circle curved sea route
      const start = point([origin.lon, origin.lat]);
      const end = point([dest.lon, dest.lat]);
      const route = greatCircle(start, end, { properties: { origin: origin.code, dest: dest.code } });
      setRouteGeoJson(route);
    } else {
      setRouteGeoJson(null);
    }
  }, [origin, dest]);

  const center: [number, number] = origin 
    ? [origin.lat, origin.lon] 
    : [20, 0];
    
  return (
    <div className="w-full h-full relative">
      <MapContainer 
        center={center} 
        zoom={origin ? 4 : 2} 
        style={{ width: '100%', height: '100%', borderRadius: '0.75rem' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {origin && (
          <Marker position={[origin.lat, origin.lon]}>
            <Popup>
              <div className="font-bold">{origin.name}</div>
              <div className="text-gray-600">{origin.country}</div>
              <div className="text-xs mt-1">Role: Loading Port</div>
            </Popup>
          </Marker>
        )}
        
        {dest && (
          <Marker position={[dest.lat, dest.lon]}>
            <Popup>
              <div className="font-bold">{dest.name}</div>
              <div className="text-gray-600">{dest.country}</div>
              <div className="text-xs mt-1">Role: Discharge Port</div>
            </Popup>
          </Marker>
        )}
        
        {routeGeoJson && (
          <GeoJSON 
            data={routeGeoJson} 
            style={{
              color: '#19B5FE',
              weight: 4,
              opacity: 0.8,
              dashArray: '10, 10'
            }}
            onEachFeature={(feature, layer) => {
              if (feature.properties) {
                const htmlContent = `
                  <div class="font-sans">
                    <strong>Transit Corridor</strong><br/>
                    ${origin?.code} &rarr; ${dest?.code}
                  </div>
                `;
                layer.bindTooltip(htmlContent, {
                  sticky: true,
                  className: 'bg-ink text-snow border-ice rounded px-2 py-1'
                });
              }
            }}
          />
        )}
      </MapContainer>
      
      {/* Ship animation styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .leaflet-container {
          background: #AADAFF; /* Ocean blue background color */
          font-family: inherit;
        }
      `}} />
    </div>
  );
}
