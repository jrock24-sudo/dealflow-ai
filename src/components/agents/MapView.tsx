"use client";

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import type { Deal } from "@/types/deals";

// Dynamic import prevents Leaflet from running during SSR
// (Leaflet accesses window/document at import time)
const MapViewInner = dynamic(() => import("./MapViewInner"), {
  ssr: false,
  loading: () => (
    <div style={loadingStyle}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>🗺️</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Loading map...</div>
    </div>
  ),
});

interface MapViewProps {
  deals: Deal[];
  geocache: Record<string, { lat: number; lng: number } | null>;
  onCacheCoords: (address: string, coords: { lat: number; lng: number } | null) => void;
  onLookup: (deal: Deal) => void;
}

export function MapView(props: MapViewProps) {
  if (props.deals.length === 0) {
    return (
      <div style={loadingStyle}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🗺️</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>No deals to map</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
          Deals in your leads queue and pipeline will appear here.
        </div>
      </div>
    );
  }

  return <MapViewInner {...props} />;
}

const loadingStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  color: "#f0ece2",
  fontFamily: "'DM Sans', sans-serif",
  background: "rgba(255,255,255,0.01)",
};
