"use client";

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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

import type { MapCommands } from "@/components/map/map-zoom-controls";
import { MapOffscreenResultsBanner } from "@/components/map/map-offscreen-results-banner";
import type { ImmigrationService } from "@/types/immimap";
import { useMapFiltersStore, ALL_STATES } from "@/stores/map-filters";
import {
  CLUSTER_DECLUTTER_PASSES,
  CLUSTER_ICON_SIZE_PX,
  relaxOverlappingClusters,
  type ClusterNode,
} from "@/lib/cluster-declutter";
import {
  FILTER_FIT_METRO_MIN_ZOOM,
  servicesForFilterFit,
  zoomAfterClosingDetail,
} from "@/lib/map-filter-fit";

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
const CLUSTER_DECLUTTER_DEBOUNCE_MS = 60;
/** Markercluster can rebuild icons after zoomend; run once more after that. */
const CLUSTER_DECLUTTER_LATE_MS = 280;

type LeafletPosIcon = HTMLElement & { _leaflet_pos?: { x: number; y: number } };

function clusterLayerPoint(icon: HTMLElement): { x: number; y: number } | null {
  const pos = (icon as LeafletPosIcon)._leaflet_pos;
  if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return null;
  return { x: pos.x, y: pos.y };
}

function clusterBubble(icon: HTMLElement): HTMLElement {
  return (
    icon.querySelector<HTMLElement>(".immimap-cluster-bubble") ?? icon
  );
}

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

function isLeafletPosError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    String(error.message).includes("_leaflet_pos")
  );
}

/**
 * Leaflet reads `el._leaflet_pos` while panning/resizing. That throws when the
 * map pane or a marker icon was already removed (unmount, cluster recycle,
 * Strict Mode double-mount, or a ResizeObserver tick after teardown).
 */
function isMapAlive(map: L.Map): boolean {
  try {
    return Boolean(map.getContainer()?.isConnected && map.getPane("mapPane"));
  } catch {
    return false;
  }
}

function runOnAliveMap(map: L.Map, fn: (map: L.Map) => void) {
  if (!isMapAlive(map)) return;
  try {
    fn(map);
  } catch (error) {
    if (!isLeafletPosError(error)) throw error;
  }
}

function invalidateMapSize(map: L.Map) {
  runOnAliveMap(map, (alive) => {
    const size = alive.getSize();
    if (size.x < 1 || size.y < 1) return;
    alive.invalidateSize({ animate: false });
  });
}

const markerProto = L.Marker.prototype as typeof L.Marker.prototype & {
  __immimapSetIconPatched?: boolean;
  _map?: L.Map | null;
};

if (!markerProto.__immimapSetIconPatched) {
  markerProto.__immimapSetIconPatched = true;
  const originalSetIcon = markerProto.setIcon;
  markerProto.setIcon = function (this: typeof markerProto, icon) {
    // Clustered markers are not on the map; updating options is enough so the
    // next time they appear they use the new icon. Calling Leaflet's setIcon
    // while `_icon` is gone is what throws `_leaflet_pos`.
    if (!this._map) {
      this.options.icon = icon;
      return this;
    }
    try {
      return originalSetIcon.call(this, icon);
    } catch (error) {
      if (!isLeafletPosError(error)) throw error;
      this.options.icon = icon;
      return this;
    }
  };
}

/** Hard-coded national overview — never derive from service bounds (Arctic bug). */
function setContinentalUsView(map: L.Map, duration = 0.8) {
  runOnAliveMap(map, (alive) => {
    // Cancel any in-flight flyTo/fitBounds so a concurrent frame cannot win.
    alive.stop();
    alive.setView(US_CENTER, US_ZOOM, {
      animate: true,
      duration,
    });
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

  runOnAliveMap(map, (alive) => {
    alive.flyToBounds(bounds, {
      duration,
      padding: FRAME_PADDING,
      maxZoom: 10,
    });
  });
}

/**
 * Filter-toggle refit: frame `services` without zooming out past metro.
 * Nationwide jumps are reserved for `setContinentalUsView` (Reset all).
 */
function isMobileMapViewport() {
  return window.matchMedia("(max-width: 767px)").matches;
}

/**
 * Leaving a street-level org detail on mobile: pull back to city/metro
 * (same zoom cap as filter-change refits) so nearby pins are visible.
 */
function fitClosingDetailToMetro(map: L.Map, origin: ImmigrationService) {
  runOnAliveMap(map, (alive) => {
    const nextZoom = zoomAfterClosingDetail(alive.getZoom());
    if (nextZoom == null) return;
    const lat = Number(origin.latitude);
    const lng = Number(origin.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    alive.flyTo([lat, lng], nextZoom, { animate: true, duration: 0.8 });
  });
}

function fitFilterChangeBounds(map: L.Map, services: ImmigrationService[]) {
  runOnAliveMap(map, (alive) => {
    const view = alive.getBounds().pad(0.4);
    const toFit = servicesForFilterFit(
      services,
      alive.getZoom(),
      (lat, lng) => view.contains(L.latLng(lat, lng)),
    );
    if (!toFit) return;

    const bounds = L.latLngBounds(
      toFit.map((service) => [
        Number(service.latitude),
        Number(service.longitude),
      ]),
    );
    if (!bounds.isValid()) return;

    const padded = bounds.pad(0.08);
    const fitZoom = alive.getBoundsZoom(
      padded,
      false,
      L.point(FRAME_PADDING[0], FRAME_PADDING[1]),
    );
    // Safety: a padded metro viewport must not still expand to a state/US frame.
    if (
      alive.getZoom() >= FILTER_FIT_METRO_MIN_ZOOM &&
      fitZoom < FILTER_FIT_METRO_MIN_ZOOM
    ) {
      return;
    }

    alive.fitBounds(padded, {
      maxZoom: FRAME_MAX_ZOOM,
      padding: FRAME_PADDING,
      animate: true,
    });
  });
}

/**
 * Frames the current result set whenever nothing is selected.
 *
 * Reset all (`nationalFrameToken`) is the only path that recenters the
 * continental US. Individual filter toggles refit the new pins with a
 * city/metro zoom-out cap so a Sacramento view does not jump nationwide.
 * Closing the detail panel on desktop leaves the camera. On mobile it
 * pulls back to city/metro zoom so nearby results are tappable again.
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
  const prevSelectedId = useRef(selectedServiceId);
  const prevServices = useRef(services);
  /** After a national reset, ignore follow-up service-list fits until focus changes. */
  const nationalLockToken = useRef(0);

  useEffect(() => {
    const previousSelectedId = prevSelectedId.current;
    const closingDrawer =
      Boolean(previousSelectedId) && !selectedServiceId;
    const servicesChanged = prevServices.current !== services;
    const originService = previousSelectedId
      ? prevServices.current.find((service) => service.id === previousSelectedId) ??
        services.find((service) => service.id === previousSelectedId)
      : undefined;
    prevSelectedId.current = selectedServiceId;
    prevServices.current = services;

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

    // Desktop: leave pan/zoom. Mobile: pull street-level detail back to metro.
    // If a filter change also cleared selection, still refit the new result set.
    if (closingDrawer && !servicesChanged) {
      if (isMobileMapViewport() && originService) {
        fitClosingDetailToMetro(map, originService);
      }
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

    fitFilterChangeBounds(map, services);
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

  useEffect(() => {
    // Closing the panel only clears selection — do not reset pan/zoom.
    if (!selected) {
      return;
    }

    let cancelled = false;

    const revealSelected = () => {
      if (cancelled) return;

      // Fly past DISABLE_CLUSTERING_AT_ZOOM so the pin is never stuck in a
      // cluster bubble. Do NOT call zoomToShowLayer — it fires moveend
      // synchronously and re-entered our previous listener (stack overflow).
      runOnAliveMap(map, (alive) => {
        alive.flyTo(
          [Number(selected.latitude), Number(selected.longitude)],
          SELECT_ZOOM,
          {
            animate: true,
            duration: 1.2,
          },
        );
      });
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
    let cancelled = false;
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        if (!cancelled) invalidateMapSize(map);
      });
    });
    const timer = window.setTimeout(() => {
      if (!cancelled) invalidateMapSize(map);
    }, DRAWER_TRANSITION_MS);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(timer);
    };
  }, [map, selectedServiceId]);

  return null;
}

/** Exposes zoomIn/zoomOut to chrome that lives outside Leaflet's container. */
function MapCommandsBridge({
  onCommandsReady,
}: {
  onCommandsReady?: (commands: MapCommands | null) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!onCommandsReady) return;
    onCommandsReady({
      zoomIn: () => {
        runOnAliveMap(map, (alive) => {
          alive.zoomIn();
        });
      },
      zoomOut: () => {
        runOnAliveMap(map, (alive) => {
          alive.zoomOut();
        });
      },
    });
    return () => onCommandsReady(null);
  }, [map, onCommandsReady]);

  return null;
}

/** Recalculate Leaflet's own viewport whenever its container element resizes. */
function MapContainerResizeSync() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let cancelled = false;
    let frame = 0;

    const observer = new ResizeObserver(() => {
      if (cancelled) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (cancelled) return;
        invalidateMapSize(map);
      });
    });
    observer.observe(container);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [map]);

  return null;
}

/**
 * Nudges cluster bubbles apart in screen space. Offset is applied to an
 * *inner* bubble element via `transform`, not the Leaflet-positioned root —
 * Leaflet writes `style.transform` on the root every pan frame, which can
 * clobber a CSS `translate` on the same node in some engines (Safari).
 * Clicking a nudged bubble still zooms around the true geographic center.
 */
function declutterOverlappingClusters(map: L.Map) {
  if (!isMapAlive(map)) return;

  const container = map.getContainer();
  const icons = Array.from(
    container.querySelectorAll<HTMLElement>(".immimap-cluster-icon"),
  );

  if (icons.length === 0) return;

  for (const icon of icons) {
    clusterBubble(icon).style.transform = "";
  }

  if (icons.length === 1) return;

  const containerRect = container.getBoundingClientRect();
  const nodes: Array<ClusterNode & { icon: HTMLElement }> = icons.map(
    (icon) => {
      const layer = clusterLayerPoint(icon);
      const rect = icon.getBoundingClientRect();
      const radius = Math.max(
        rect.width,
        rect.height,
        icon.offsetWidth,
        icon.offsetHeight,
        CLUSTER_ICON_SIZE_PX,
      ) / 2;
      return {
        icon,
        count: Number.parseInt(icon.textContent ?? "0", 10) || 0,
        x:
          layer?.x ??
          rect.left + rect.width / 2 - containerRect.left,
        y:
          layer?.y ??
          rect.top + rect.height / 2 - containerRect.top,
        radius,
        dx: 0,
        dy: 0,
      };
    },
  );

  relaxOverlappingClusters(nodes, CLUSTER_DECLUTTER_PASSES);

  for (const node of nodes) {
    const bubble = clusterBubble(node.icon);
    bubble.style.transform =
      Math.abs(node.dx) > 0.1 || Math.abs(node.dy) > 0.1
        ? `translate(${node.dx.toFixed(1)}px, ${node.dy.toFixed(1)}px)`
        : "";
  }
}

function ClusterDeclutter() {
  const map = useMap();

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let timer = 0;

    const runNow = () => {
      if (cancelled) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (cancelled || !isMapAlive(map)) return;
        declutterOverlappingClusters(map);
      });
    };

    const schedule = () => {
      if (cancelled) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(runNow, CLUSTER_DECLUTTER_DEBOUNCE_MS);
    };

    const onZoomEnd = () => {
      runNow();
      window.clearTimeout(timer);
      timer = window.setTimeout(runNow, CLUSTER_DECLUTTER_LATE_MS);
    };

    map.on("moveend resize", schedule);
    map.on("zoomend", onZoomEnd);

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
      cancelled = true;
      map.off("moveend resize", schedule);
      map.off("zoomend", onZoomEnd);
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
    html: `<span class="immimap-cluster-bubble">${count}</span>`,
    iconSize: [CLUSTER_ICON_SIZE_PX, CLUSTER_ICON_SIZE_PX],
    iconAnchor: [CLUSTER_ICON_SIZE_PX / 2, CLUSTER_ICON_SIZE_PX / 2],
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

type ViewportOffscreenReport = {
  inView: number;
  nearest: ImmigrationService | null;
};

/**
 * Reports how many filtered pins sit in the current viewport, plus the
 * nearest pin to the camera center. Used only for the off-screen results
 * banner — does not move the map.
 */
function ViewportOffscreenProbe({
  services,
  onReport,
}: {
  services: ImmigrationService[];
  onReport: (report: ViewportOffscreenReport) => void;
}) {
  const map = useMap();
  const onReportRef = useRef(onReport);
  onReportRef.current = onReport;

  useEffect(() => {
    let timer = 0;

    const measure = () => {
      if (!isMapAlive(map)) return;
      try {
        const bounds = map.getBounds();
        if (!bounds.isValid()) {
          onReportRef.current({ inView: 0, nearest: null });
          return;
        }
        const center = map.getCenter();
        let inView = 0;
        let nearest: ImmigrationService | null = null;
        let nearestDist = Infinity;
        for (const service of services) {
          const pos = servicePosition(service);
          if (!pos) continue;
          const latlng = L.latLng(pos[0], pos[1]);
          if (bounds.contains(latlng)) inView += 1;
          const dist = center.distanceTo(latlng);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearest = service;
          }
        }
        onReportRef.current({ inView, nearest });
      } catch (error) {
        if (!isLeafletPosError(error)) throw error;
      }
    };

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(measure, 80);
    };

    map.on("moveend zoomend", schedule);
    measure();
    return () => {
      map.off("moveend zoomend", schedule);
      window.clearTimeout(timer);
    };
  }, [map, services]);

  return null;
}

type Props = {
  services: ImmigrationService[];
  ariaLabel: string;
  onCommandsReady?: (commands: MapCommands | null) => void;
};

export function ImmimapMapClient({
  services,
  ariaLabel,
  onCommandsReady,
}: Props) {
  const selectedServiceId = useMapFiltersStore((s) => s.selectedServiceId);
  const selectService = useMapFiltersStore((s) => s.selectService);
  const filterCategories = useMapFiltersStore((s) => s.categories);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markerRegistryRef = useRef<MarkerRegistry>(new Map());
  const [viewportInView, setViewportInView] = useState<number | null>(null);
  const [nearestOffscreen, setNearestOffscreen] =
    useState<ImmigrationService | null>(null);

  const mappableServices = useMemo(
    () => services.filter(hasValidCoordinates),
    [services],
  );

  const onViewportReport = useCallback((report: ViewportOffscreenReport) => {
    setViewportInView(report.inView);
    setNearestOffscreen(report.nearest);
  }, []);

  const showOffscreenBanner =
    !selectedServiceId &&
    mappableServices.length > 0 &&
    viewportInView === 0 &&
    nearestOffscreen !== null;

  const filterLabel =
    filterCategories.length === 1 ? filterCategories[0] : null;

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
          className="immimap-leaflet z-0 h-full w-full overflow-hidden bg-transparent"
          scrollWheelZoom={false}
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
          <MapCommandsBridge onCommandsReady={onCommandsReady} />
          <FitVisibleServices services={mappableServices} />
          <MapSelectionController selected={selected} />
          <MapInvalidateOnDrawer />
          <MapContainerResizeSync />
          <ClusterDeclutter />
          <ViewportOffscreenProbe
            services={mappableServices}
            onReport={onViewportReport}
          />
          <MarkerClusterGroup
            ref={
              clusterGroupRef as MutableRefObject<L.MarkerClusterGroup | null>
            }
            chunkedLoading
            // Zoom-in/out cluster CSS animations race with icon recycle and
            // throw `_leaflet_pos` when a pane is already gone.
            animate={false}
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
        {showOffscreenBanner ? (
          <MapOffscreenResultsBanner
            filterLabel={filterLabel}
            elsewhereCount={services.length}
            onShowNearest={() => {
              if (nearestOffscreen) selectService(nearestOffscreen.id);
            }}
          />
        ) : null}
      </MarkerRegistryContext.Provider>
    </div>
  );
}
