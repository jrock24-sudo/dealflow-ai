"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Deal } from "@/types/deals";

const STATUS_COLOR: Record<string, string> = {
  strong: "#4A9C6D",
  marginal: "#C8A23C",
  rejected: "#E74C3C",
};

interface MapViewInnerProps {
  deals: Deal[];
  geocache: Record<string, { lat: number; lng: number } | null>;
  onCacheCoords: (address: string, coords: { lat: number; lng: number } | null) => void;
  onLookup: (deal: Deal) => void;
}

export default function MapViewInner({ deals, geocache, onCacheCoords }: MapViewInnerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const [status, setStatus] = useState("Loading map...");
  const [geocodeProgress, setGeocodeProgress] = useState(0);

  // Geocode a single address via server-side proxy (avoids CORS/403 from Nominatim)
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    // Check cache first
    if (address in geocache) return geocache[address];

    // Skip addresses that look like cross-streets ("Main St & 2nd Ave") or vague descriptions
    const hasStreetNumber = /^\d+\s/.test(address.trim()) || /\b\d{3,}\b/.test(address);
    const isIntersection = /&|@|intersection|cross/i.test(address);
    if (!hasStreetNumber || isIntersection) {
      onCacheCoords(address, null);
      return null;
    }

    try {
      const r = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
      if (!r.ok) {
        onCacheCoords(address, null);
        return null;
      }
      const data = await r.json();
      if (Array.isArray(data) && data[0]) {
        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        onCacheCoords(address, coords);
        return coords;
      }
      onCacheCoords(address, null);
      return null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!mapRef.current) return;

    let cancelled = false;

    const init = async () => {
      // Dynamic import to avoid SSR issues
      const L = (await import("leaflet")).default;

      // Fix default marker icon paths broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (cancelled) return;

      // Create map centered on Las Vegas by default
      const map = L.map(mapRef.current!, {
        center: [36.1699, -115.1398],
        zoom: 11,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      setStatus("");

      // Geocode deals and add markers
      const dealsToGeocode = deals.slice(0, 30); // cap at 30 to avoid rate limiting
      setGeocodeProgress(0);

      for (let i = 0; i < dealsToGeocode.length; i++) {
        if (cancelled) break;
        const deal = dealsToGeocode[i];
        const coords = await geocodeAddress(deal.address);
        if (coords && !cancelled) {
          const color = STATUS_COLOR[deal.status] || "#888";
          const marker = L.circleMarker([coords.lat, coords.lng], {
            radius: 10,
            fillColor: color,
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.85,
          }).addTo(map);

          const fin = deal.financials
            ?.map((f) => `<div style="display:flex;justify-content:space-between;gap:16px;font-size:11px;padding:2px 0"><span style="color:rgba(255,255,255,0.5)">${f.label}</span><span style="color:${f.highlight ? color : "#f0ece2"};font-weight:600">${f.value}</span></div>`)
            .join("") || "";

          marker.bindPopup(`
            <div style="font-family:'DM Sans',sans-serif;min-width:200px;max-width:280px;color:#f0ece2">
              <div style="font-weight:700;font-size:13px;margin-bottom:4px">${deal.address}</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:8px">${deal.details?.slice(0, 80) || ""}</div>
              ${deal.owner?.name ? `<div style="font-size:11px;color:${color};margin-bottom:6px">Owner: ${deal.owner.name}</div>` : ""}
              ${deal.isQCT ? '<span style="font-size:10px;background:rgba(200,162,60,0.15);color:#C8A23C;padding:2px 6px;border-radius:4px;margin-right:4px">QCT</span>' : ""}
              ${deal.isOZ ? '<span style="font-size:10px;background:rgba(74,156,109,0.15);color:#4A9C6D;padding:2px 6px;border-radius:4px">OZ</span>' : ""}
              ${fin ? `<div style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.08);padding-top:8px">${fin}</div>` : ""}
            </div>
          `, {
            maxWidth: 300,
            className: "dealflow-popup",
          });

          markersRef.current.push(marker);

          // Fit bounds if we have markers
          if (i === 0 || i === dealsToGeocode.length - 1) {
            const allLatLngs = markersRef.current
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((m: any) => m.getLatLng());
            if (allLatLngs.length > 0) {
              map.fitBounds(L.latLngBounds(allLatLngs), { padding: [40, 40], maxZoom: 14 });
            }
          }
        }
        setGeocodeProgress(Math.round(((i + 1) / dealsToGeocode.length) * 100));
        // Rate limit: 1 request per second for Nominatim
        if (!(deal.address in geocache)) {
          await new Promise((r) => setTimeout(r, 1100));
        }
      }

      if (!cancelled) setGeocodeProgress(100);
    };

    init().catch((e) => {
      if (!cancelled) setStatus(`Map error: ${e.message}`);
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
        markersRef.current = [];
      }
    };
    // Re-run when deals change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals.map((d) => d.id).join(",")]);

  return (
    <div style={s.wrapper}>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <style>{`
        .leaflet-popup-content-wrapper {
          background: #1a1a1a !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 10px !important;
          box-shadow: 0 4px 24px rgba(0,0,0,0.6) !important;
        }
        .leaflet-popup-tip { background: #1a1a1a !important; }
        .leaflet-popup-close-button { color: rgba(255,255,255,0.4) !important; }
      `}</style>

      {status && (
        <div style={s.statusOverlay}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{status}</div>
        </div>
      )}
      {geocodeProgress > 0 && geocodeProgress < 100 && (
        <div style={s.progressBar}>
          <div style={{ width: `${geocodeProgress}%`, height: "100%", background: "#C8A23C", transition: "width .3s" }} />
        </div>
      )}

      {/* Legend */}
      <div style={s.legend}>
        <div style={s.legendItem("#4A9C6D")}>✅ Strong</div>
        <div style={s.legendItem("#C8A23C")}>⚠️ Marginal</div>
        <div style={s.legendItem("#E74C3C")}>❌ Rejected</div>
      </div>

      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

const s = {
  wrapper: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  } as CSSProperties,
  statusOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    background: "rgba(12,12,12,0.7)",
    pointerEvents: "none",
  } as CSSProperties,
  progressBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: "rgba(255,255,255,0.08)",
    zIndex: 20,
  } as CSSProperties,
  legend: {
    position: "absolute",
    bottom: 24,
    right: 12,
    background: "rgba(17,17,17,0.92)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "8px 12px",
    zIndex: 20,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  } as CSSProperties,
  legendItem: (color: string): CSSProperties => ({
    fontSize: 11,
    color,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
  }),
};
