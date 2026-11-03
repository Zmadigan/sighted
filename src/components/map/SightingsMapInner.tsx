"use client";

import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import L from "leaflet";
import Link from "next/link";
import { useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { CATEGORIES, CATEGORY_INFO } from "@/lib/categories";
import { CategoryBadge, CategoryIcon } from "../CategoryIcon";
import { formatDate } from "@/lib/format";
import { DEFAULT_CENTER, pinIcon, TILE_ATTRIBUTION, TILE_URL } from "./pins";

export type MapSighting = {
  id: string;
  commonName: string;
  category: string;
  observedOn: string;
  latitude: number;
  longitude: number;
  hasPhoto: boolean;
};

export default function SightingsMapInner({
  sightings,
  compact = false,
}: {
  sightings: MapSighting[];
  /** Small map for a single sighting's page */
  compact?: boolean;
}) {
  const icons = useMemo(
    () =>
      Object.fromEntries(
        CATEGORIES.map((c) => [
          c,
          pinIcon(
            CATEGORY_INFO[c].color,
            renderToStaticMarkup(<CategoryIcon category={c} width={16} height={16} strokeWidth={2.5} />),
          ),
        ]),
      ),
    [],
  );

  const bounds =
    sightings.length > 0
      ? (sightings.map((s) => [s.latitude, s.longitude]) as [number, number][])
      : undefined;

  return (
    <MapContainer
      {...(bounds ? { bounds, boundsOptions: { padding: [40, 40], maxZoom: 13 } } : { center: DEFAULT_CENTER, zoom: 6 })}
      className={
        compact
          ? "h-48 w-full rounded-xl"
          : "h-[calc(100dvh-15rem)] min-h-80 w-full rounded-xl md:h-[calc(100dvh-12rem)]"
      }
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <MarkerClusterGroup
        chunkedLoading
        showCoverageOnHover={false}
        maxClusterRadius={45}
        spiderfyOnMaxZoom
        iconCreateFunction={clusterIcon}
      >
        {sightings.map((s) => {
          return (
            <Marker key={s.id} position={[s.latitude, s.longitude]} icon={icons[s.category] ?? icons.other}>
              <Popup>
                <div className="w-44">
                  {s.hasPhoto && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/photos/${s.id}`}
                      alt={s.commonName}
                      className="mb-2 h-28 w-full rounded-lg object-cover"
                    />
                  )}
                  <p className="!m-0 text-base font-bold">{s.commonName}</p>
                  <p className="!m-0 mt-1 flex items-center gap-2 text-xs text-bark-500">
                    <CategoryBadge category={s.category} />
                    {formatDate(s.observedOn)}
                  </p>
                  <Link href={`/journal/${s.id}`} className="mt-1 inline-block font-semibold">
                    View sighting →
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}

/** Nearby pins merge into one green bubble showing how many sightings are inside. */
function clusterIcon(cluster: { getChildCount(): number }) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 36 : count < 100 ? 42 : 48;
  return L.divIcon({
    className: "sighted-pin",
    iconSize: [size, size],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#2c4e2c;color:#fff;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)">${count}</div>`,
  });
}
