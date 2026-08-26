"use client";

import {
  createContext,
  memo,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type MouseEvent,
  type MutableRefObject,
} from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";

import type { ImmigrationService } from "@/types/immimap";
import { useMapFiltersStore, ALL_STATES } from "@/stores/map-filters";
import { STATE_BOUNDING_BOXES } from "@/lib/us-states";

const OSM_TILE =
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

/** Geographic center of the contiguous United States (fixed national reset). */
const US_CENTER: [number, number] = [39.8283, -98.5795];
const US_ZOOM = 4;

/** Deep zoom so a selected pin is never left inside a cluster bubble. */
const SELECT_ZOOM = 14;
/** Must stay below SELECT_ZOOM so selection always lands past clustering. */
const DISABLE_CLUSTERING_AT_ZOOM = 12;
const DRAWER_TRANSITION_MS = 300;
const FOCUS_SETTLE_MS = 60;
const FRAME_PADDING: [number, number] = [50, 50];
const FRAME_MAX_ZOOM = 12;
/** Cluster bubble diameter (see .immimap-cluster-icon) plus a small gap. */
const CLUSTER_MIN_GAP_PX = 48;
/** A couple of relaxation passes settle simple overlap chains (A–B–C). */
const CLUSTER_DECLUTTER_PASSES = 3;
const CLUSTER_DECLUTTER_DEBOUNCE_MS = 60;

type MarkerRegistry = Map<string, L.Marker>;

type MarkerRegistryApi = {
  register: (id: string, marker: L.Marker) => void;
  unregister: (id: string, marker: L.Marker) => void;
  get: (id: string) => L.Marker | undefined;
};

const MarkerRegistryContext = createContext<MarkerRegistryApi | null>(null);

function useMarkerRegistry() {
  const api = useContext(MarkerRegistryContext);
  if (!api) {
    throw new Error("MapMarker must be used within MarkerRegistryContext");
  }
  return api;
}

/** Hard-coded national overview — never derive from service bounds (Arctic bug). */
function setContinentalUsView(map: L.Map, duration = 0.8) {
  // Cancel any in-flight flyTo/fitBounds so a concurrent frame cannot win.
  map.stop();
  map.setView(US_CENTER, US_ZOOM, {
    animate: true,
    duration,
  });
}

function flyToCorners(
  map: L.Map,
  corners: [[number, number], [number, number]],
  duration = 1.2,
) {
  const southWest = L.latLng(corners[0][0], corners[0][1]);
  const northEast = L.latLng(corners[1][0], corners[1][1]);
  const bounds = L.latLngBounds(southWest, northEast);

  if (!bounds.isValid()) {
    setContinentalUsView(map, duration);
    return;
  }

  map.flyToBounds(bounds, {
    duration,
    padding: FRAME_PADDING,
    maxZoom: 10,
  });
}

function fitServicesBounds(map: L.Map, services: ImmigrationService[]) {
  // Exclude AK/HI from multi-state frames — including them expands the box into
  // northern Canada / the Arctic and is the Reset-all teleport bug.
  const lower48 = services.filter(
    (service) =>
      service.state !== "AK" &&
      service.state !== "HI" &&
      hasValidCoordinates(service) &&
      Number(service.latitude) >= 24 &&
      Number(service.latitude) <= 50 &&
      Number(service.longitude) >= -125 &&
      Number(service.longitude) <= -66,
  );

  if (lower48.length === 0) {
    setContinentalUsView(map, 1.0);
    return;
  }

  const states = new Set(lower48.map((service) => service.state));
  // Wide multi-state result sets → hardcoded US center, not a stretched box.
  if (states.size >= 8) {
    setContinentalUsView(map, 1.0);
    return;
  }

  const bounds = L.latLngBounds(
    lower48.map((service) => [
      Number(service.latitude),
      Number(service.longitude),
    ]),
  );

  if (!bounds.isValid()) {
    setContinentalUsView(map, 1.0);
    return;
  }

  map.fitBounds(bounds.pad(0.08), {
    maxZoom: FRAME_MAX_ZOOM,
    padding: FRAME_PADDING,
    animate: true,
  });
}

/**
 * Frames the current result set whenever nothing is selected.
 * Runs on search clear, filter reset, city selection, and drawer close.
 * When `nationalFrameToken` bumps (Reset all), hard-centers the continental US.
 */
function FitVisibleServices({ services }: { services: ImmigrationService[] }) {
  const map = useMap();
  const selectedServiceId = useMapFiltersStore((s) => s.selectedServiceId);
  const nationalFrameToken = useMapFiltersStore((s) => s.nationalFrameToken);
  const focusBounds = useMapFiltersStore((s) => s.focusBounds);
  const focusBoundsToken = useMapFiltersStore((s) => s.focusBoundsToken);
  const states = useMapFiltersStore((s) => s.states);
  const lastNationalToken = useRef(0);
  const lastFocusToken = useRef(0);
  /** After a national reset, ignore follow-up service-list fits until focus changes. */
  const nationalLockToken = useRef(0);

  useEffect(() => {
    // National reset always wins — even if a provider is still selected for a tick.
    if (nationalFrameToken > lastNationalToken.current) {
      lastNationalToken.current = nationalFrameToken;
      lastFocusToken.current = focusBoundsToken;
      nationalLockToken.current = nationalFrameToken;
      setContinentalUsView(map, 0.85);
      return;
    }

    if (selectedServiceId) return;

    if (focusBounds && focusBoundsToken > lastFocusToken.current) {
      lastFocusToken.current = focusBoundsToken;
      nationalLockToken.current = 0;
      flyToCorners(map, focusBounds, 1.2);
      return;
    }

    // Keep an explicit state/region frame until cleared.
    if (focusBounds) {
      return;
    }

    // After Reset all, ignore service-list refits that would yank the camera
    // back to provider bounds (or race an in-flight fitBounds animation).
    if (
      nationalLockToken.current > 0 &&
      nationalLockToken.current === nationalFrameToken &&
      states.length === ALL_STATES.length
    ) {
      return;
    }

    fitServicesBounds(map, services);
  }, [
    map,
    services,
    selectedServiceId,
    nationalFrameToken,
    focusBounds,
    focusBoundsToken,
    states,
  ]);

  return null;
}

function MapSelectionController({
  selected,
}: {
  selected: ImmigrationService | null;
}) {
  const map = useMap();
  const previousSelectedId = useRef<string | null>(null);

  useEffect(() => {
    const prevId = previousSelectedId.current;
    const nextId = selected?.id ?? null;
    previousSelectedId.current = nextId;

    // Drawer closed → restore state / continental context (not street-level zoom).
    if (!selected) {
      if (!prevId) return;

      const { states, focusBounds } = useMapFiltersStore.getState();

      if (focusBounds) {
        flyToCorners(map, focusBounds, 0.8);
        return;
      }

      if (states.length === 1) {
        const bounds = STATE_BOUNDING_BOXES[states[0]];
        if (bounds) {
          flyToCorners(map, bounds, 0.8);
          return;
        }
      }

      setContinentalUsView(map, 0.8);
      return;
    }

    let cancelled = false;

    const revealSelected = () => {
      if (cancelled) return;

      // Fly past DISABLE_CLUSTERING_AT_ZOOM so the pin is never stuck in a
      // cluster bubble. Do NOT call zoomToShowLayer — it fires moveend
      // synchronously and re-entered our previous listener (stack overflow).
      map.flyTo(
        [Number(selected.latitude), Number(selected.longitude)],
        SELECT_ZOOM,
        {
          animate: true,
          duration: 1.2,
        },
      );
    };

    const timer = window.setTimeout(revealSelected, FOCUS_SETTLE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [map, selected]);

  return null;
}

/** Recalculate Leaflet viewport after the detail drawer open/close finishes. */
function MapInvalidateOnDrawer() {
  const map = useMap();
  const selectedServiceId = useMapFiltersStore((s) => s.selectedServiceId);

  useEffect(() => {
    // Double-RAF: wait for layout paint after sidebar overlay mounts/unmounts.
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        map.invalidateSize({ animate: false });
      });
    });
    const timer = window.setTimeout(() => {
      map.invalidateSize({ animate: true });
    }, DRAWER_TRANSITION_MS);

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(timer);
    };
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
      className="leaflet-top leaflet-right !top-3 !right-3 sm:!top-4 sm:!right-4"
      onDoubleClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="leaflet-control leaflet-bar flex overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
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

/** Recalculate Leaflet's own viewport whenever its container element resizes. */
function MapContainerResizeSync() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let frame = 0;

    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        map.invalidateSize({ animate: false });
      });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [map]);

  return null;
}

/**
 * Nudges cluster bubbles apart in screen space when their centers land
 * closer than the bubble diameter. leaflet.markercluster builds clusters
 * bottom-up per zoom level and recenters each one on the weighted centroid
 * of its children as they're added — two clusters that were far enough
 * apart when first formed can still end up with centroids this close after
 * later children shift them, so overlap has to be resolved after the fact,
 * on the rendered bubbles, not by tuning maxClusterRadius.
 *
 * This only offsets the bubble's on-screen position via the CSS `translate`
 * property (which composes independently of Leaflet's own positioning
 * `transform`, so it survives Leaflet repositioning the icon on every pan
 * frame). It never touches the underlying cluster's real lat/lng — clicking
 * a nudged bubble still zooms/spiderfies around its true geographic center.
 */
function declutterOverlappingClusters(map: L.Map) {
  const container = map.getContainer();
  const icons = Array.from(
    container.querySelectorAll<HTMLElement>(".immimap-cluster-icon"),
  );

  if (icons.length === 0) return;

  // Measure geographic (Leaflet) positions, not any prior collision offset —
  // otherwise a second pass would treat the nudge as real and keep pushing.
  for (const icon of icons) {
    icon.style.translate = "";
  }

  if (icons.length === 1) return;

  const containerRect = container.getBoundingClientRect();
  const nodes = icons.map((icon) => {
    const rect = icon.getBoundingClientRect();
    return {
      icon,
      count: Number.parseInt(icon.textContent ?? "0", 10) || 0,
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top + rect.height / 2 - containerRect.top,
      dx: 0,
      dy: 0,
    };
  });

  for (let pass = 0; pass < CLUSTER_DECLUTTER_PASSES; pass += 1) {
    let moved = false;

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        let vx = b.x + b.dx - (a.x + a.dx);
        let vy = b.y + b.dy - (a.y + a.dy);
        let distance = Math.hypot(vx, vy);
        if (distance >= CLUSTER_MIN_GAP_PX) continue;

        if (distance < 0.5) {
          // Identical centers: push along a fixed diagonal so bubbles don't
          // stack invisibly on top of one another.
          vx = 1;
          vy = 1;
          distance = Math.SQRT2;
        }

        const overlap = CLUSTER_MIN_GAP_PX - distance;
        const ux = vx / distance;
        const uy = vy / distance;
        // The smaller cluster yields; a tie yields `a` so the result is
        // deterministic instead of jittering between passes.
        const mover = a.count <= b.count ? a : b;
        const sign = mover === a ? -1 : 1;

        mover.dx += ux * overlap * sign;
        mover.dy += uy * overlap * sign;
        moved = true;
      }
    }

    if (!moved) break;
  }

  for (const node of nodes) {
    node.icon.style.translate =
      Math.abs(node.dx) > 0.1 || Math.abs(node.dy) > 0.1
        ? `${node.dx.toFixed(1)}px ${node.dy.toFixed(1)}px`
        : "";
  }
}

function ClusterDeclutter() {
  const map = useMap();

  useEffect(() => {
    let frame = 0;
    let timer = 0;

    const runNow = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() =>
        declutterOverlappingClusters(map),
      );
    };

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(runNow, CLUSTER_DECLUTTER_DEBOUNCE_MS);
    };

    map.on("moveend zoomend resize", schedule);

    // Cluster icons are (re)created on pan/zoom and as chunkedLoading adds
    // markers — observe the pane directly rather than relying on any one
    // plugin event name to catch every case that changes bubble positions.
    const pane = map.getPane("markerPane");
    const observer = pane ? new MutationObserver(schedule) : null;
    observer?.observe(pane as HTMLElement, {
      childList: true,
      subtree: true,
    });

    schedule();

    return () => {
      map.off("moveend zoomend resize", schedule);
      observer?.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [map]);

  return null;
}

function hasValidCoordinates(service: ImmigrationService): boolean {
  const lat = Number(service.latitude);
  const lng = Number(service.longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat !== 0 &&
    lng !== 0 &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function servicePosition(
  service: ImmigrationService,
): [number, number] | null {
  if (!hasValidCoordinates(service)) return null;
  return [Number(service.latitude), Number(service.longitude)];
}

function createPinIcon(active: boolean) {
  // Active pins are ~25% larger so they read clearly against muted neighbors.
  // Fill is hard-coded (not currentColor) so pins never go invisible if CSS
  // inheritance or className overrides fail on the divIcon root.
  const width = active ? 40 : 32;
  const height = active ? 52 : 42;
  const fill = active ? "#2563eb" : "#1d4ed8";

  return L.divIcon({
    className: `immimap-marker-icon${active ? " immimap-marker-highlighted" : " immimap-marker-muted"}`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -(height - 2)],
    html: `
      <div class="immimap-pin-graphic" aria-hidden="true" style="width:${width}px;height:${height}px;color:${fill}">
        <svg focusable="false" viewBox="0 0 32 42" width="${width}" height="${height}">
          <path
            d="M16 1.5C8.8 1.5 3 7.3 3 14.5 3 24.25 16 40 16 40s13-15.75 13-25.5C29 7.3 23.2 1.5 16 1.5Z"
            fill="${fill}"
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
  const isSelected = useMapFiltersStore(
    (s) => s.selectedServiceId === service.id,
  );
  const isHovered = useMapFiltersStore(
    (s) => s.hoveredProviderId === service.id,
  );
  const isActive = isSelected || isHovered;
  const onSelect = useMapFiltersStore((s) => s.selectService);
  const setHoveredId = useMapFiltersStore((s) => s.setHoveredProviderId);
  const registry = useMarkerRegistry();
  const markerRef = useRef<L.Marker | null>(null);
  const pinIcon = useMemo(() => createPinIcon(isActive), [isActive]);
  const position = useMemo(
    () => servicePosition(service),
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
    const marker = markerRef.current;
    if (!marker) return;

    registry.register(service.id, marker);
    return () => {
      registry.unregister(service.id, marker);
    };
  }, [registry, service.id]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.setIcon(pinIcon);
    marker.setZIndexOffset(isActive ? 9999 : 0);
  }, [isActive, pinIcon]);

  if (!position) {
    return null;
  }

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={pinIcon}
      zIndexOffset={isActive ? 9999 : 0}
      eventHandlers={eventHandlers}
    />
  );
});

type Props = {
  services: ImmigrationService[];
  ariaLabel: string;
};

export function ImmimapMapClient({ services, ariaLabel }: Props) {
  const selectedServiceId = useMapFiltersStore((s) => s.selectedServiceId);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markerRegistryRef = useRef<MarkerRegistry>(new Map());

  const mappableServices = useMemo(
    () => services.filter(hasValidCoordinates),
    [services],
  );

  const registryApi = useMemo<MarkerRegistryApi>(() => {
    const registry = markerRegistryRef.current;
    return {
      register: (id, marker) => {
        registry.set(id, marker);
      },
      unregister: (id, marker) => {
        if (registry.get(id) === marker) {
          registry.delete(id);
        }
      },
      get: (id) => registry.get(id),
    };
  }, []);

  const selected = useMemo(
    () => mappableServices.find((s) => s.id === selectedServiceId) ?? null,
    [mappableServices, selectedServiceId],
  );

  return (
    <div className="absolute inset-0 h-full w-full overflow-hidden" role="application" aria-label={ariaLabel}>
      <MarkerRegistryContext.Provider value={registryApi}>
        <MapContainer
          center={US_CENTER}
          zoom={US_ZOOM}
          className="immimap-leaflet z-0 h-full w-full overflow-hidden bg-muted/40"
          scrollWheelZoom
          touchZoom
          doubleClickZoom
          boxZoom
          dragging
          zoomSnap={0.25}
          zoomDelta={0.5}
          wheelDebounceTime={10}
          wheelPxPerZoomLevel={40}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={OSM_TILE}
          />
          <MapZoomControls />
          <FitVisibleServices services={mappableServices} />
          <MapSelectionController selected={selected} />
          <MapInvalidateOnDrawer />
          <MapContainerResizeSync />
          <ClusterDeclutter />
          <MarkerClusterGroup
            ref={
              clusterGroupRef as MutableRefObject<L.MarkerClusterGroup | null>
            }
            chunkedLoading
            showCoverageOnHover={false}
            spiderfyOnMaxZoom
            spiderfyDistanceMultiplier={1.4}
            // City / provider zoom always shows individual pins, not cluster bubbles.
            disableClusteringAtZoom={DISABLE_CLUSTERING_AT_ZOOM}
            iconCreateFunction={createClusterIcon}
            maxClusterRadius={56}
          >
            {mappableServices.map((service) => (
              <MapMarker key={service.id} service={service} />
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </MarkerRegistryContext.Provider>
    </div>
  );
}
