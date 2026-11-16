/** محرر حدود المناطق على الخريطة (Leaflet) — يحمل بس بصفحة المناطق */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapProvider, Zone } from '../data/types';

interface Props {
  zones: Zone[];
  selected: number;
  tiles: MapProvider;
  restaurant: { lat: number; lng: number };
  /** وضع الرسم: كل ضغطة على الخريطة تضيف نقطة */
  drawing: boolean;
  activeVertex: number | null;
  onVertex: (k: number | null) => void;
  onChange: (polygon: [number, number][]) => void;
}

const dot = (size: number, bg: string, border = '#fff') =>
  L.divIcon({ className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2], html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${bg};border:3px solid ${border};box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>` });

export default function ZoneMap({ zones, selected, tiles, restaurant, drawing, activeVertex, onVertex, onChange }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const cb = useRef({ onChange, onVertex, drawing });
  cb.current = { onChange, onVertex, drawing };
  const polyRef = useRef<[number, number][]>([]);
  polyRef.current = zones[selected]?.polygon ?? [];

  useEffect(() => {
    const map = L.map(el.current!, { zoomControl: true }).setView([restaurant.lat, restaurant.lng], 12);
    L.tileLayer(tiles.tileUrl, { maxZoom: tiles.maxZoom, attribution: tiles.attribution, ...(tiles.subdomains ? { subdomains: tiles.subdomains } : {}) }).addTo(map);
    map.attributionControl.setPrefix(false);
    layer.current = L.layerGroup().addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!cb.current.drawing) return;
      cb.current.onChange([...polyRef.current, [+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)]]);
    });
    mapRef.current = map;
    const all = zones.flatMap((z) => z.polygon);
    if (all.length) map.fitBounds(L.latLngBounds(all), { padding: [20, 20] });
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // نرسم من جديد كل ما تتغير الحدود
  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    zones.forEach((z, k) => {
      if (k === selected || z.polygon.length < 3) return;
      L.polygon(z.polygon, { color: '#6b7280', weight: 1.5, dashArray: '5 5', fillOpacity: 0.05, interactive: false }).addTo(g);
    });
    const poly = zones[selected]?.polygon ?? [];
    if (!poly.length) return;
    const shape = poly.length >= 3 ? L.polygon(poly, { color: '#d99a00', weight: 3, fillColor: '#ffc72c', fillOpacity: 0.18, interactive: false }) : L.polyline(poly, { color: '#d99a00', weight: 3 });
    shape.addTo(g);
    // نقاط وسط الأضلاع: ضغطة = نقطة جديدة
    if (poly.length >= 2) {
      poly.forEach((p, k) => {
        const q = poly[(k + 1) % poly.length];
        if (poly.length < 3 && k === poly.length - 1) return;
        const mid: [number, number] = [+((p[0] + q[0]) / 2).toFixed(6), +((p[1] + q[1]) / 2).toFixed(6)];
        L.marker(mid, { icon: dot(14, 'rgba(255,199,44,.7)', '#17140f'), keyboard: false })
          .on('click', () => { const next = [...poly]; next.splice(k + 1, 0, mid); cb.current.onChange(next); cb.current.onVertex(k + 1); })
          .addTo(g);
      });
    }
    poly.forEach((p, k) => {
      const m = L.marker(p, { draggable: true, icon: dot(22, k === activeVertex ? '#e4472b' : '#17140f'), autoPan: true });
      m.on('drag', () => { const ll = m.getLatLng(); const next = [...poly]; next[k] = [ll.lat, ll.lng]; (shape as L.Polygon).setLatLngs(next); });
      m.on('dragend', () => { const ll = m.getLatLng(); const next = [...poly]; next[k] = [+ll.lat.toFixed(6), +ll.lng.toFixed(6)]; cb.current.onChange(next); });
      m.on('click', () => cb.current.onVertex(k === activeVertex ? null : k));
      m.addTo(g);
    });
  }, [zones, selected, activeVertex]);

  // نركّز على المنطقة المختارة
  useEffect(() => {
    const poly = zones[selected]?.polygon ?? [];
    if (mapRef.current && poly.length >= 3) mapRef.current.fitBounds(L.latLngBounds(poly), { padding: [24, 24] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return <div dir="ltr" ref={el} className="h-[380px] overflow-hidden rounded-[18px] border border-line" aria-label="خريطة حدود المناطق" />;
}
