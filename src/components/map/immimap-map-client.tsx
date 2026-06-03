"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from "react";
import L, { type LatLngBoundsExpression } from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";

import type { Embassy, ImmigrationService } from "@/types/immimap";
import { getEmbassies, getWaitTier } from "@/lib/embassy-data";
import { useMapFiltersStore } from "@/stores/map-filters";

const OSM_TILE =
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const DEFAULT_BOUNDS: LatLngBoundsExpression = [
  [24.2, -124.6],
  [43.3, -66.8],
];

function FitVisibleServices({ services }: { services: ImmigrationService[] }) {
  const map = useMap();

  useEffect(() => {
    if (services.length === 0) {
      map.fitBounds(DEFAULT_BOUNDS, { padding: [32, 32], animate: true });
      return;
    }

    const bounds = L.latLngBounds(
      services.map((service) => [service.latitude, service.longitude]),
    );
    map.fitBounds(bounds.pad(0.18), {
      maxZoom: 10,
      padding: [36, 36],
      animate: true,
    });
  }, [map, services]);

  return null;
}

function MapFocus({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 9), { duration: 0.45 });
  }, [map, lat, lng]);
  return null;
}

function MapZoomControls() {
  const map = useMap();

  const handleZoomClick = (
    event: MouseEvent<HTMLButtonElement>,
    direction: "in" | "out",
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (direction === "in") {
      map.zoomIn();
      return;
    }

    map.zoomOut();
  };

  return (
    <div
      className="leaflet-top leaflet-right"
      onDoubleClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="leaflet-control flex overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center border-r border-slate-200 text-lg font-semibold leading-none text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#2563eb]"
          aria-label="Zoom in"
          onClick={(event) => handleZoomClick(event, "in")}
        >
          +
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center text-xl font-semibold leading-none text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#2563eb]"
          aria-label="Zoom out"
          onClick={(event) => handleZoomClick(event, "out")}
        >
          -
        </button>
      </div>
    </div>
  );
}

function SmoothWheelZoom() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    map.scrollWheelZoom.disable();

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const deltaModeMultiplier =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? container.clientHeight
            : 1;
      const normalizedDeltaY = event.deltaY * deltaModeMultiplier;
      const zoomDelta = Math.max(-0.5, Math.min(0.5, -normalizedDeltaY * 0.01));
      const nextZoom = Math.max(
        map.getMinZoom(),
        Math.min(map.getMaxZoom(), map.getZoom() + zoomDelta),
      );
      const point = map.mouseEventToContainerPoint(event);

      map.setZoomAround(point, nextZoom, { animate: true });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [map]);

  return null;
}

function createPinIcon() {
  return L.divIcon({
    className: "immimap-marker-icon",
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -40],
    html: `
      <div class="immimap-pin-graphic" aria-hidden="true">
        <svg focusable="false" viewBox="0 0 32 42" width="32" height="42">
          <path
            d="M16 1.5C8.8 1.5 3 7.3 3 14.5 3 24.25 16 40 16 40s13-15.75 13-25.5C29 7.3 23.2 1.5 16 1.5Z"
            fill="currentColor"
            stroke="white"
            stroke-width="2.5"
          />
          <circle cx="16" cy="14.5" r="4.25" fill="white" opacity="0.95" />
        </svg>
      </div>
    `,
  });
}

function createClusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();

  return L.divIcon({
    className: "immimap-cluster-icon",
    html: `<span>${count}</span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

type MapMarkerProps = {
  service: ImmigrationService;
  registerMarker: (id: string, marker: L.Marker | null) => void;
};

const MapMarker = memo(function MapMarker({
  service,
  registerMarker,
}: MapMarkerProps) {
  const isActive = useMapFiltersStore(
    (s) =>
      s.hoveredProviderId === service.id || s.selectedServiceId === service.id,
  );
  const onSelect = useMapFiltersStore((s) => s.selectService);
  const setHoveredId = useMapFiltersStore((s) => s.setHoveredProviderId);
  const markerRef = useRef<L.Marker | null>(null);
  const pinIcon = useMemo(() => createPinIcon(), []);
  const position = useMemo(
    () => [service.latitude, service.longitude] as [number, number],
    [service.latitude, service.longitude],
  );
  const eventHandlers = useMemo(
    () => ({
      click: () => onSelect(service.id),
      mouseout: () => setHoveredId(null),
      mouseover: () => setHoveredId(service.id),
    }),
    [onSelect, service.id, setHoveredId],
  );

  useEffect(() => {
    registerMarker(service.id, markerRef.current);

    return () => {
      registerMarker(service.id, null);
    };
  }, [registerMarker, service.id]);

  useEffect(() => {
    const element = markerRef.current?.getElement();
    element?.classList.toggle("immimap-marker-highlighted", isActive);

    return () => {
      element?.classList.remove("immimap-marker-highlighted");
    };
  }, [isActive]);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={pinIcon}
      zIndexOffset={isActive ? 9999 : 0}
      eventHandlers={eventHandlers}
    >
      <Popup>
        <div className="max-w-[220px] space-y-1">
          <p className="font-semibold leading-snug">{service.name}</p>
          <p className="text-xs text-muted-foreground">{service.address}</p>
        </div>
      </Popup>
    </Marker>
  );
});

type ClusterHoverRevealProps = {
  clusterRef: RefObject<L.MarkerClusterGroup | null>;
  markerRefs: RefObject<Map<string, L.Marker>>;
};

function ClusterHoverReveal({
  clusterRef,
  markerRefs,
}: ClusterHoverRevealProps) {
  const hoveredProviderId = useMapFiltersStore((s) => s.hoveredProviderId);
  const previousMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    previousMarkerRef.current
      ?.getElement()
      ?.classList.remove("immimap-marker-highlighted");

    if (!hoveredProviderId) {
      previousMarkerRef.current = null;
      return;
    }

    const marker = markerRefs.current.get(hoveredProviderId);
    const clusterGroup = clusterRef.current;
    if (!marker || !clusterGroup) return;

    previousMarkerRef.current = marker;
    clusterGroup.zoomToShowLayer(marker, () => {
      marker.getElement()?.classList.add("immimap-marker-highlighted");
    });
  }, [clusterRef, hoveredProviderId, markerRefs]);

  return null;
}

// ── Embassy layer ─────────────────────────────────────────────────────────────

/** Hex colours matching the wait-tier definitions in embassy-data.ts */
const TIER_COLORS = {
  critical: "#dc2626",
  elevated: "#f59e0b",
  normal: "#16a34a",
} as const;

function createEmbassyIcon(waitDays: number) {
  const tier = getWaitTier(waitDays);
  const color = TIER_COLORS[tier];
  return L.divIcon({
    className: "immimap-embassy-icon",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -34],
    html: `
      <div style="color:${color};display:flex;align-items:center;justify-content:center;" aria-hidden="true">
        <svg focusable="false" viewBox="0 0 28 36" width="28" height="36">
          <path
            d="M14 1C7.4 1 2 6.4 2 13c0 8.5 12 24 12 24S26 21.5 26 13C26 6.4 20.6 1 14 1Z"
            fill="currentColor"
            stroke="white"
            stroke-width="2"
          />
          <rect x="9" y="9" width="10" height="7" rx="1" fill="white" opacity="0.9" />
          <line x1="14" y1="9" x2="14" y2="7" stroke="white" stroke-width="1.5" />
          <line x1="11" y1="7" x2="17" y2="7" stroke="white" stroke-width="1.5" />
        </svg>
      </div>
    `,
  });
}

const EmbassyMarker = memo(function EmbassyMarker({
  embassy,
}: {
  embassy: Embassy;
}) {
  const icon = useMemo(
    () => createEmbassyIcon(embassy.avg_interview_wait_days),
    [embassy.avg_interview_wait_days],
  );
  const position = useMemo(
    () => [embassy.latitude, embassy.longitude] as [number, number],
    [embassy.latitude, embassy.longitude],
  );
  const tier = getWaitTier(embassy.avg_interview_wait_days);
  const tierLabel =
    tier === "critical"
      ? "300+ days"
      : tier === "elevated"
        ? "30–299 days"
        : "< 30 days";

  return (
    <Marker position={position} icon={icon}>
      <Popup>
        <div className="min-w-[180px] space-y-2 py-1">
          <p className="font-semibold leading-snug">{embassy.name}</p>
          <p className="text-xs text-muted-foreground">
            {embassy.city}, {embassy.country}
          </p>
          <div className="flex items-center gap-2 pt-0.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: TIER_COLORS[tier] }}
            />
            <span className="text-xs font-medium">
              ~{embassy.avg_interview_wait_days} days ({tierLabel})
            </span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
});

function EmbassyLayer() {
  const embassies = useMemo(() => getEmbassies(), []);
  return (
    <>
      {embassies.map((embassy) => (
        <EmbassyMarker key={embassy.id} embassy={embassy} />
      ))}
    </>
  );
}

/** Toggle button rendered as a Leaflet control (top-left). */
function MapLayerToggle({
  showEmbassies,
  onToggle,
}: {
  showEmbassies: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="leaflet-top leaflet-left"
      style={{ marginTop: "10px", marginLeft: "10px" }}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="leaflet-control">
        <button
          type="button"
          onClick={onToggle}
          className={`flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-medium shadow-sm transition-colors ${
            showEmbassies
              ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
          aria-pressed={showEmbassies}
          title={showEmbassies ? "Hide embassies" : "Show US embassies"}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: showEmbassies ? "#2563eb" : "#94a3b8" }}
            aria-hidden
          />
          Embassies
        </button>
      </div>
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function EmbassyLegend() {
  return (
    <div
      className="leaflet-bottom leaflet-left"
      style={{ marginBottom: "10px", marginLeft: "10px" }}
    >
      <div className="leaflet-control rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Interview wait
        </p>
        {(
          [
            { color: "#dc2626", label: "300+ days" },
            { color: "#f59e0b", label: "30–299 days" },
            { color: "#16a34a", label: "< 30 days" },
          ] as const
        ).map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 py-0.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: color }}
            />
            <span className="text-xs text-slate-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type Props = {
  services: ImmigrationService[];
  ariaLabel: string;
};

export function ImmimapMapClient({ services, ariaLabel }: Props) {
  const [showEmbassies, setShowEmbassies] = useState(false);
  const selectedServiceId = useMapFiltersStore((s) => s.selectedServiceId);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markerRefs = useRef(new Map<string, L.Marker>());

  const selected = useMemo(
    () => services.find((s) => s.id === selectedServiceId),
    [services, selectedServiceId],
  );
  const registerMarker = useCallback((id: string, marker: L.Marker | null) => {
    if (marker) {
      markerRefs.current.set(id, marker);
      return;
    }

    markerRefs.current.delete(id);
  }, []);

  return (
    <div
      className="h-full w-full touch-none overflow-hidden"
      role="application"
      aria-label={ariaLabel}
      onWheelCapture={(event) => {
        event.stopPropagation();
      }}
    >
      <MapContainer
        bounds={DEFAULT_BOUNDS}
        className="immimap-leaflet z-0 h-full w-full touch-none overflow-hidden bg-muted/40"
        scrollWheelZoom={true}
        wheelDebounceTime={100}
        wheelPxPerZoomLevel={150}
        zoomSnap={0.1}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={OSM_TILE}
        />
        <MapZoomControls />
        <MapLayerToggle
          showEmbassies={showEmbassies}
          onToggle={() => setShowEmbassies((v) => !v)}
        />
        <SmoothWheelZoom />
        <FitVisibleServices services={services} />
        {selected ? (
          <MapFocus
            lat={selected.latitude}
            lng={selected.longitude}
          />
        ) : null}
        <MarkerClusterGroup
          ref={clusterRef}
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          spiderfyDistanceMultiplier={1.4}
          iconCreateFunction={createClusterIcon}
          maxClusterRadius={56}
        >
          {services.map((service) => (
            <MapMarker
              key={service.id}
              service={service}
              registerMarker={registerMarker}
            />
          ))}
        </MarkerClusterGroup>
        <ClusterHoverReveal clusterRef={clusterRef} markerRefs={markerRefs} />
        {showEmbassies && <EmbassyLayer />}
        {showEmbassies && <EmbassyLegend />}
      </MapContainer>
    </div>
  );
}
