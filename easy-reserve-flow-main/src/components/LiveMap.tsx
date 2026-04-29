import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons (Leaflet+bundlers issue)
const customerIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="background:hsl(var(--primary,217 91% 60%));width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);"><div style="transform:rotate(45deg);color:white;font-weight:bold;text-align:center;line-height:22px;font-size:14px;">📍</div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});
const workerIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="background:#16a34a;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);text-align:center;line-height:22px;font-size:14px;">🛠️</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export type LatLng = { lat: number; lng: number };

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [map, points]);
  return null;
}

export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function LiveMap({
  customer,
  worker,
  height = 280,
}: {
  customer?: LatLng | null;
  worker?: LatLng | null;
  height?: number;
}) {
  const points = useMemo(
    () => [customer, worker].filter((p): p is LatLng => !!p && Number.isFinite(p.lat)),
    [customer, worker],
  );

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed bg-muted/30 text-xs text-muted-foreground"
        style={{ height }}
      >
        No live location shared yet.
      </div>
    );
  }

  const center: [number, number] = [points[0].lat, points[0].lng];

  return (
    <div className="overflow-hidden rounded-lg border" style={{ height }}>
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {customer && (
          <Marker position={[customer.lat, customer.lng]} icon={customerIcon}>
            <Popup>Customer location</Popup>
          </Marker>
        )}
        {worker && (
          <Marker position={[worker.lat, worker.lng]} icon={workerIcon}>
            <Popup>Worker location</Popup>
          </Marker>
        )}
        {customer && worker && (
          <Polyline
            positions={[
              [customer.lat, customer.lng],
              [worker.lat, worker.lng],
            ]}
            pathOptions={{ color: "#3b82f6", weight: 4, dashArray: "8 6" }}
          />
        )}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}
