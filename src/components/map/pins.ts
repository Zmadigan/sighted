import L from "leaflet";

/** A teardrop map pin in any color, drawn with plain HTML (no image files needed). */
export function pinIcon(color: string, emoji = "") {
  return L.divIcon({
    className: "sighted-pin",
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38],
    html: `<div style="position:relative;width:32px;height:42px">
      <svg width="32" height="42" viewBox="0 0 32 42" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))">
        <path d="M16 0C7.2 0 0 7 0 15.7 0 27.5 16 42 16 42s16-14.5 16-26.3C32 7 24.8 0 16 0z" fill="${color}" stroke="white" stroke-width="2"/>
      </svg>
      <span style="position:absolute;top:6px;left:0;width:32px;text-align:center;font-size:15px;line-height:18px">${emoji}</span>
    </div>`,
  });
}

// Middle of the northeastern US, used when we don't know where the user is.
export const DEFAULT_CENTER: [number, number] = [42.5, -73.5];

export const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
