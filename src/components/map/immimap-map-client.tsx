"use client";

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  type MouseEvent,
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

import type { ImmigrationService } from "@/types/immimap";
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

function MapResetOnDeselect() {
  const map = useMap();
  const selectedServiceId = useMapFiltersStore((s) => s.selectedServiceId);
  const previousSelection = useRef<string | null>(null);

  useEffect(() => {
    if (previousSelection.current && !selectedServiceId) {
      map.fitBounds(DEFAULT_BOUNDS, { padding: [32, 32], animate: true });
    }
    previousSelection.current = selectedServiceId;
  }, [map, selectedServiceId]);

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
};

const MapMarker = memo(function MapMarker({ service }: MapMarkerProps) {
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

type Props = {
  services: ImmigrationService[];
  ariaLabel: string;
};

export function ImmimapMapClient({ services, ariaLabel }: Props) {
  const selectedServiceId = useMapFiltersStore((s) => s.selectedServiceId);

  const selected = useMemo(
    () => services.find((s) => s.id === selectedServiceId),
    [services, selectedServiceId],
  );

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
        <SmoothWheelZoom />
        <FitVisibleServices services={services} />
        <MapResetOnDeselect />
        {selected ? (
          <MapFocus
            lat={selected.latitude}
            lng={selected.longitude}
          />
        ) : null}
        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          spiderfyDistanceMultiplier={1.4}
          iconCreateFunction={createClusterIcon}
          maxClusterRadius={56}
        >
          {services.map((service) => (
            <MapMarker key={service.id} service={service} />
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
