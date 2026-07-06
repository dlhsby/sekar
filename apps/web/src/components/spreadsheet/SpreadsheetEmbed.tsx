'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Maximize2, Minimize2 } from 'lucide-react';

import {
  Button,
  Card,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { cn } from '@/lib/utils/cn';

export interface SpreadsheetOption {
  key: string;
  label: string;
  url: string;
}

export interface SpreadsheetEmbedProps {
  /** Prefix label shown before the select, e.g. "Data Base". */
  label: string;
  options: SpreadsheetOption[];
}

/**
 * "<Label>: [Select]" picker + a large embedded Google Sheets iframe below it.
 * Replaces a segmented-tab layout, which overflowed with many spreadsheets.
 * The iframe defaults to near-full viewport height; the maximize button gives
 * a true browser fullscreen for smaller screens (auto-fullscreen on load is
 * blocked by browsers without a user gesture).
 */
export function SpreadsheetEmbed({ label, options }: SpreadsheetEmbedProps) {
  const { t } = useTranslation();
  const [active, setActive] = useState(options[0]?.key);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeOption = options.find((option) => option.key === active) ?? options[0];

  useEffect(() => {
    const handleChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      containerRef.current?.requestFullscreen?.();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 font-heading text-nb-body-sm font-bold text-nb-black">
          {label}:
        </span>
        <Select value={active} onValueChange={setActive}>
          <SelectTrigger className="w-full min-w-[200px] flex-1 sm:w-80 sm:flex-none" aria-label={label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="ml-auto"
          onClick={toggleFullscreen}
          aria-label={t(isFullscreen ? 'common:actions.exitFullscreen' : 'common:actions.fullscreen')}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
      <Card ref={containerRef} variant="default" className={cn('overflow-hidden p-0', isFullscreen && 'h-screen w-screen rounded-none border-0')}>
        {activeOption && (
          <iframe
            key={activeOption.key}
            src={activeOption.url}
            title={activeOption.label}
            className={cn(
              'w-full border-0',
              isFullscreen ? 'h-full' : 'h-[calc(100dvh-260px)] min-h-[420px]'
            )}
            loading="lazy"
          />
        )}
      </Card>
    </div>
  );
}
