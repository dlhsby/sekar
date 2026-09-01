'use client';

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@/components/ui';
import { parseKmlToGeometry } from '@/lib/utils/kml';

type BoundaryGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;

interface ImportBoundaryButtonProps {
  /** Called with the parsed boundary when the user applies a valid KML/GeoJSON. */
  onImport: (geometry: BoundaryGeometry) => void;
  disabled?: boolean;
}

/**
 * Import an area/district boundary from a Google-Earth KML file or pasted KML /
 * GeoJSON text — lets the user maintain the shape in Google Earth and re-import
 * it here. Parsing is client-side (see parseKmlToGeometry).
 */
export function ImportBoundaryButton({ onImport, disabled }: ImportBoundaryButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setText(await file.text());
    } catch {
      toast.error(t('admin:maps.boundary.fileReadError'));
    }
  };

  const handleApply = () => {
    const geometry = parseKmlToGeometry(text);
    if (!geometry) {
      toast.error(t('admin:maps.boundary.invalidKml'));
      return;
    }
    onImport(geometry);
    toast.success(t('admin:maps.boundary.successMessage'));
    setOpen(false);
    setText('');
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        leftIcon={<Upload className="h-4 w-4" aria-hidden />}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {t('admin:maps.boundary.importButton')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{t('admin:maps.boundary.importTitle')}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-nb-body-sm text-nb-gray-600">
              {t('admin:maps.boundary.uploadDescription')}
            </p>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".kml,application/vnd.google-earth.kml+xml,application/xml,text/xml"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                {t('admin:maps.boundary.selectFileButton')}
              </Button>
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={t('admin:maps.boundary.pasteDescription')}
              className="font-mono text-nb-body-sm"
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {t('admin:shared.cancel')}
            </Button>
            <Button type="button" onClick={handleApply} disabled={!text.trim()}>
              {t('admin:maps.boundary.applyButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
