import type { RefObject } from 'react';

interface MapCanvasProps {
  mapRef: RefObject<HTMLDivElement | null>;
}

export function MapCanvas({ mapRef }: MapCanvasProps) {
  return <div id="map" ref={mapRef} />;
}
