"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { DEFAULT_CENTER, pinIcon, TILE_ATTRIBUTION, TILE_URL } from "./pins";

export type LatLng = { lat: number; lng: number };

function ClickToPlace({ onChange }: { onChange: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function Recenter({ value }: { value: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (value && !map.getBounds().contains([value.lat, value.lng])) {
      map.setView([value.lat, value.lng], Math.max(map.getZoom(), 13));
    }
  }, [map, value]);
  return null;
}

export default function LocationPickerInner({
  value,
  onChange,
  color,
}: {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
  color: string;
}) {
  const icon = useMemo(() => pinIcon(color), [color]);
  return (
    <MapContainer
      center={value ? [value.lat, value.lng] : DEFAULT_CENTER}
      zoom={value ? 13 : 6}
      className="h-64 w-full rounded-xl"
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <ClickToPlace onChange={onChange} />
      <Recenter value={value} />
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={icon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = e.target.getLatLng();
              onChange({ lat: p.lat, lng: p.lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
