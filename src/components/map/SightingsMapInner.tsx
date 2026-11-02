"use client";

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
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
    </MapContainer>
  );
}
