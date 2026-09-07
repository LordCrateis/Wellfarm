import { LocalizedContent } from "@/i18n/TranslationProvider";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { Severity } from "@/data/mock";
import { useTranslation } from "@/i18n/TranslationProvider";

export interface WellfarmMapPoint {
  latitude: number;
  longitude: number;
  label: string;
  detail?: string;
  severity?: Severity;
}

interface WellfarmMapProps {
  points: WellfarmMapPoint[];
  ariaLabel: string;
  className?: string;
  center?: [number, number];
  zoom?: number;
  maxFitZoom?: number;
  showLegend?: boolean;
  approximateRadiusMeters?: number;
}

const severityColors: Record<Severity, string> = {
  low: "#287250",
  moderate: "#d3972f",
  high: "#a53d36",
};

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#039;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

export function WellfarmMap({
  points,
  ariaLabel,
  className = "h-[360px]",
  center,
  zoom,
  maxFitZoom = 11,
  showLegend = false,
  approximateRadiusMeters,
}: WellfarmMapProps) {
  const { t, locale } = useTranslation();
  const mapNode = useRef<HTMLDivElement | null>(null);
  const pointKey = JSON.stringify(points);
  const centerKey = center?.join(",") ?? "";

  useEffect(() => {
    if (!mapNode.current) return;

    const map = L.map(mapNode.current, {
      attributionControl: true,
      scrollWheelZoom: true,
      zoomControl: false,
      minZoom: 3,
    });
    map.attributionControl.setPrefix(false);
    const node = mapNode.current;
    // Capture Ctrl-wheel/trackpad pinch before the browser changes page zoom.
    // Ordinary wheel events are handled by Leaflet and never reach page scroll.
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        event.stopImmediatePropagation();
        const point = map.mouseEventToContainerPoint(event);
        map.setZoomAround(point, map.getZoom() + (event.deltaY < 0 ? 1 : -1));
      }
    };
    node.addEventListener("wheel", wheel, { passive: false, capture: true });
    L.control.zoom({ zoomInTitle: t("Zoom in"), zoomOutTitle: t("Zoom out") }).addTo(map);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const bounds = L.latLngBounds([]);
    for (const point of points) {
      const latLng = L.latLng(point.latitude, point.longitude);
      bounds.extend(latLng);

      if (approximateRadiusMeters) {
        L.circle(latLng, {
          radius: approximateRadiusMeters,
          color: "#287250",
          fillColor: "#6fa37f",
          fillOpacity: 0.16,
          weight: 2,
        }).addTo(map);
      }

      const marker = L.circleMarker(latLng, {
        radius: points.length === 1 ? 9 : 8,
        color: "#fffdf7",
        fillColor: severityColors[point.severity ?? "low"],
        fillOpacity: 1,
        weight: 3,
      });

      const title = escapeHtml(t(point.label));
      const detail = point.detail
        ? `<span>${escapeHtml(t(point.detail))}</span>`
        : "";
      marker.bindTooltip(`<strong>${title}</strong>${detail}`, {
        direction: "top",
        offset: [0, -8],
        className: "wf-map-tooltip",
      });
      marker.bindPopup(`<strong>${title}</strong>${detail}`, {
        closeButton: false,
        className: "wf-map-popup",
      });
      marker.on("add", () => {
        const markerNode = marker.getElement();
        markerNode?.setAttribute(
          "aria-label",
          `${t(point.label)}${point.detail ? `, ${t(point.detail)}` : ""}`,
        );
        markerNode?.setAttribute("tabindex", "0");
      });
      marker.addTo(map);
    }

    if (center) {
      map.setView(center, zoom ?? 10);
    } else if (bounds.isValid()) {
      if (points.length === 1) {
        map.setView(bounds.getCenter(), zoom ?? maxFitZoom);
      } else {
        map.fitBounds(bounds.pad(0.2), {
          maxZoom: maxFitZoom,
          padding: [24, 24],
        });
      }
    } else {
      map.setView([22.7, 79], zoom ?? 4);
    }

    const observer = new ResizeObserver(() => map.invalidateSize(false));
    observer.observe(mapNode.current);
    const settleTimer = window.setTimeout(() => map.invalidateSize(false), 100);

    return () => {
      window.clearTimeout(settleTimer);
      node.removeEventListener("wheel", wheel, true);
      observer.disconnect();
      map.remove();
    };
    // pointKey and centerKey make the map update when serializable map data changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointKey, centerKey, zoom, maxFitZoom, approximateRadiusMeters, locale]);

  return <LocalizedContent>{(
    <div className="wf-map-shell" role="region" aria-label={ariaLabel}>
      <div
        ref={mapNode}
        className={`wf-leaflet-map ${className}`}
        data-testid="wellfarm-map"
      />
      {showLegend && (
        <div className="wf-map-legend" aria-label="Severity legend">
          <strong>Severity</strong>
          {(["low", "moderate", "high"] as Severity[]).map((severity) => (
            <span key={severity}>
              <i style={{ backgroundColor: severityColors[severity] }} />
              {severity[0].toUpperCase() + severity.slice(1)}
            </span>
          ))}
        </div>
      )}
      <p className="sr-only">
        {points
          .map(
            (point) =>
              `${point.label}${point.detail ? `: ${point.detail}` : ""}`,
          )
          .join(". ")}
      </p>
    </div>
  )}</LocalizedContent>;
}
