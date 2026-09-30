'use client';
import dynamic from 'next/dynamic';
import { type Port } from '@/lib/freight';

// Dynamically import the real Leaflet map with SSR disabled
// Leaflet uses 'window' object which crashes Next.js on the server
const MapWithNoSSR = dynamic(() => import('./RealMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#AADAFF] rounded-xl flex items-center justify-center border border-slate/30">
      <div className="animate-pulse text-ocean-blue font-semibold text-lg flex items-center gap-3">
        <svg className="animate-spin h-5 w-5 text-ocean-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading maritime route...
      </div>
    </div>
  )
});

export default function RouteMap({ origin, dest }: { origin: Port | undefined; dest: Port | undefined }) {
  return <MapWithNoSSR origin={origin} dest={dest} />;
}
