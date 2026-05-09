import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { WidgetNode } from "../../lib/types";
import { resolveBinding } from "../bindings";

const defaultIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export function Map({ node, data, backendUrl }: { node: WidgetNode; data: Record<string, unknown>; backendUrl: string | null }) {
  const pins = resolveBinding(node.bindings?.pins ?? "$.", data, backendUrl);
  const arr = (Array.isArray(pins) ? pins : []) as Array<{ lat: number; lng: number; label?: string }>;
  const center = (node.props?.center as [number, number]) || (arr[0] ? [arr[0].lat, arr[0].lng] : [35.6895, 139.6917]);
  const zoom = (node.props?.zoom as number) || 6;
  return (
    <div className="rounded-2xl overflow-hidden h-56">
      <MapContainer center={center} zoom={zoom} className="h-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {arr.map((p, i) => (
          <Marker key={i} position={[p.lat, p.lng]} icon={defaultIcon}>
            {p.label && <Popup>{p.label}</Popup>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
