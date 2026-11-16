/**
 * خريطة تحديد موقع التوصيل (Leaflet + OpenStreetMap — مجانية).
 * الدبوس ثابت بنص الخريطة والزبون يحرك الخريطة بإصبعه (مثل توترز/طلبات).
 * تنحمل بس لما الزبون يفتح شاشة الطلب (lazy) حتى المنيو يبقى خفيف.
 */
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Plus, Minus } from 'lucide-react';
import type { MapProvider, Zone } from '../data/types';
import type { LatLng } from '../lib/delivery';
import { assetBase } from '../lib/format';

interface Props {
  /** نقطة البداية (موقع المطعم أو آخر دبوس) */
  start: LatLng;
  /** لما يوصل الـ GPS: الخريطة تطير لهنا */
  target: LatLng | null;
  zones: Zone[];
  restaurant: LatLng;
  onMove: (p: LatLng) => void;
  onLocate: () => void;
  locating: boolean;
  /** مزود الخرائط من الإعدادات (OpenStreetMap حالياً) */
  tiles: MapProvider;
}

export default function MapPicker({ start, target, zones, restaurant, onMove, onLocate, locating, tiles }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [dragging, setDragging] = useState(false);
  const moveRef = useRef(onMove);
  moveRef.current = onMove;

  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, { zoomControl: false, attributionControl: true, tapHold: false } as L.MapOptions).setView([start.lat, start.lng], 16);
    mapRef.current = map;
    L.tileLayer(tiles.tileUrl, {
      maxZoom: tiles.maxZoom,
      attribution: tiles.attribution,
      ...(tiles.subdomains ? { subdomains: tiles.subdomains } : {}),
    }).addTo(map);
    map.attributionControl.setPrefix(false);
    for (const z of zones) {
      if (z.polygon.length < 3) continue;
      L.polygon(z.polygon, { color: '#d99a00', weight: 2, opacity: 0.7, dashArray: '6 6', fillColor: '#ffc72c', fillOpacity: 0.06, interactive: false }).addTo(map);
    }
    L.marker([restaurant.lat, restaurant.lng], {
      interactive: false,
      icon: L.divIcon({
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        html: `<div style="width:40px;height:40px;border-radius:999px;background:#fff;display:grid;place-items:center;box-shadow:0 4px 12px rgba(0,0,0,.3)"><img src="${assetBase()}brand/logo-sm.webp" style="width:28px;height:28px;object-fit:contain" alt=""/></div>`,
      }),
    }).addTo(map);

    const emit = () => {
      const c = map.getCenter();
      moveRef.current({ lat: c.lat, lng: c.lng });
    };
    map.on('movestart', () => setDragging(true));
    map.on('moveend', () => { setDragging(false); emit(); });
    map.on('click', (e: L.LeafletMouseEvent) => map.panTo(e.latlng));
    emit();
    // الخريطة داخل حاوية تتحرك (حركة فتح الشاشة) — نعيد حساب الحجم
    const t = setTimeout(() => map.invalidateSize(), 350);
    return () => { clearTimeout(t); map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (target && mapRef.current) mapRef.current.flyTo([target.lat, target.lng], 17, { duration: 0.8 });
  }, [target]);

  return (
    <div dir="ltr" className="relative h-[300px] overflow-hidden rounded-[20px] border border-line bg-[#e8e4dc]">
      <div ref={el} className="absolute inset-0 z-0" aria-label="خريطة: حرّك الخريطة حتى يصير الدبوس على بيتك" role="application" />

      {/* الدبوس الثابت بالنص */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 z-[500] -translate-x-1/2 -translate-y-full">
        <div className={`transition-transform duration-200 ${dragging ? '-translate-y-3' : ''}`}>
          <svg width="44" height="54" viewBox="0 0 44 54" aria-hidden>
            <path d="M22 2C11 2 3 10.3 3 20.6 3 34 22 52 22 52s19-18 19-31.4C41 10.3 33 2 22 2z" fill="#17140f" stroke="#fff" strokeWidth="3" />
            <circle cx="22" cy="20.5" r="7.5" fill="#ffc72c" />
          </svg>
        </div>
      </div>
      <div className={`pointer-events-none absolute top-1/2 left-1/2 z-[499] h-2 w-5 -translate-x-1/2 rounded-full bg-black/35 blur-[1.5px] transition-all duration-200 ${dragging ? 'scale-75 opacity-50' : ''}`} />

      <div className="absolute top-3 left-3 z-[600] flex flex-col overflow-hidden rounded-2xl bg-white shadow-md">
        <button type="button" aria-label="قرّب" onClick={() => mapRef.current?.zoomIn()} className="grid size-11 place-items-center border-b border-black/10 text-[#17140f]"><Plus size={18} /></button>
        <button type="button" aria-label="بعّد" onClick={() => mapRef.current?.zoomOut()} className="grid size-11 place-items-center text-[#17140f]"><Minus size={18} /></button>
      </div>
      <button type="button" onClick={onLocate} aria-label="رجّعني لموقعي"
        className="absolute right-3 bottom-8 z-[600] grid size-12 place-items-center rounded-full bg-white text-[#17140f] shadow-md">
        <LocateFixed size={21} className={locating ? 'animate-pulse text-[#d99a00]' : ''} />
      </button>
    </div>
  );
}
