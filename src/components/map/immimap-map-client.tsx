"use client";

import { useEffect, useMemo } from "react";
import L, { type LatLngBoundsExpression } from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "react-leaflet-markercluster/styles";

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

type Props = {
  services: ImmigrationService[];
  ariaLabel: string;
};

export function ImmimapMapClient({ services, ariaLabel }: Props) {
  const selectedServiceId = useMapFiltersStore((s) => s.selectedServiceId);
  const selectService = useMapFiltersStore((s) => s.selectService);

  const pinIcon = useMemo(
    () =>
      L.icon({
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    [],
  );

  const selected = useMemo(
    () => services.find((s) => s.id === selectedServiceId),
    [services, selectedServiceId],
  );

  return (
    <div
      className="h-full w-full"
      role="application"
      aria-label={ariaLabel}
    >
      <MapContainer
        bounds={DEFAULT_BOUNDS}
        className="immimap-leaflet z-0 h-full w-full bg-muted/40"
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={OSM_TILE}
        />
        <ZoomControl position="bottomright" />
        <FitVisibleServices services={services} />
        {selected ? (
          <MapFocus
            lat={selected.latitude}
            lng={selected.longitude}
          />
        ) : null}
        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          maxClusterRadius={56}
        >
          {services.map((svc) => (
            <Marker
              key={svc.id}
              position={[svc.latitude, svc.longitude]}
              icon={pinIcon}
              eventHandlers={{
                click: () => selectService(svc.id),
              }}
            >
              <Popup>
                <div className="max-w-[220px] space-y-1">
                  <p className="font-semibold leading-snug">{svc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {svc.address}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
