'use client';

/**
 * Read-only coordinate display modal backed by Google Maps.
 *
 * Shows a single marker at the given coordinate. Falls back to an external
 * "Buka di Google Maps" link when no Google Maps key is configured. Opened by
 * CoordinateLink from the Rayon + Area tables / detail modals.
 */

import { ExternalLink } from 'lucide-react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui';
import { cn, nbFocusRing } from '@/lib/utils/cn';
import { formatLatLng, googleMapsUrl } from '@/lib/utils/geo';
import { GoogleMapsGate } from './GoogleMapsGate';

const MAP_OPTIONS: google.maps.MapOptions = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

export interface MapDisplayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lat: number;
  lng: number;
  title?: string;
}

function ExternalLinkRow({ lat, lng }: { lat: number; lng: number }) {
  return (
    <a
      href={googleMapsUrl(lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 font-bold text-nb-primary hover:text-nb-primary-hover',
        nbFocusRing
      )}
    >
      <ExternalLink className="h-4 w-4" aria-hidden />
      Buka di Google Maps
    </a>
  );
}

export function MapDisplayModal({
  open,
  onOpenChange,
  lat,
  lng,
  title = 'Lokasi',
}: MapDisplayModalProps) {
  const position = { lat, lng };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <GoogleMapsGate
            fallback={
              <div className="rounded-nb-base border-2 border-nb-black bg-nb-gray-100 p-4">
                <p className="mb-2 text-nb-body-sm text-nb-gray-700">
                  Peta tidak tersedia. Buka koordinat di Google Maps:
                </p>
                <ExternalLinkRow lat={lat} lng={lng} />
              </div>
            }
          >
            <div className="overflow-hidden rounded-nb-base border-2 border-nb-black shadow-nb-sm">
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '360px' }}
                center={position}
                zoom={16}
                options={MAP_OPTIONS}
              >
                <Marker position={position} />
              </GoogleMap>
            </div>
          </GoogleMapsGate>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-nb-body-sm">{formatLatLng(lat, lng)}</span>
            <ExternalLinkRow lat={lat} lng={lng} />
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
