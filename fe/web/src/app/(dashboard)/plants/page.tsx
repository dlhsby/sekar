'use client';

/**
 * Plants Catalog Page
 * Display all plant species with search, pagination, and area selector
 */

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Badge,
  Button,
  FormInput,
  FormSelect,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  SkeletonTable,
  EmptyState,
} from '@/components/ui';
import { useSpeciesCatalog } from '@/lib/api/plants';
import { useAreas } from '@/lib/api/areas';

const CATEGORY_LABELS: Record<string, string> = {
  tree: 'Pohon',
  shrub: 'Semak',
  groundcover: 'Penutup Tanah',
  flower: 'Bunga',
};

export default function PlantsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const LIMIT = 20;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch species catalog
  const { data: catalogData, isLoading: catalogLoading } = useSpeciesCatalog(
    debouncedSearch ? 1 : currentPage,
    debouncedSearch,
    LIMIT
  );

  // Fetch areas for selector
  const { data: areasResponse } = useAreas({ limit: 1000 });
  const areas = useMemo(() => areasResponse?.data ?? [], [areasResponse]);

  // Determine if we're in search mode (no pagination) or paginated mode
  const isSearching = !!debouncedSearch;
  const totalItems = catalogData?.total ?? 0;
  const totalPages = isSearching ? 1 : Math.ceil(totalItems / LIMIT);
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handleAreaSelect = (value: string) => {
    if (value && value !== 'none') {
      router.push(`/plants/${value}`);
    }
  };

  const handlePrevPage = () => {
    if (canPrev) setCurrentPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (canNext) setCurrentPage((p) => p + 1);
  };

  if (catalogLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton variant="heading" className="w-48" />
          <div className="flex gap-4">
            <Skeleton variant="text" className="flex-1" />
            <Skeleton variant="text" className="w-48" />
          </div>
        </div>
        <SkeletonTable rows={10} />
      </div>
    );
  }

  const species = catalogData?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-nb-h1 text-nb-black">Tanaman</h1>
        <p className="text-nb-body text-nb-gray-600">
          Katalog spesies tanaman dan pengelolaan per area
        </p>
      </div>

      {/* Search & Area Selector */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-3">
        <div className="flex-1">
          <FormInput
            label="Cari spesies"
            placeholder="Cari nama atau nama Latin..."
            value={search}
            leftIcon={<Search className="w-5 h-5" />}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <FormSelect
          label="Ke Area"
          options={[
            { value: 'none', label: '-- Pilih Area --' },
            ...areas.map((area) => ({
              value: area.id,
              label: area.name,
            })),
          ]}
          value="none"
          onChange={handleAreaSelect}
          className="w-full lg:w-48"
        />
      </div>

      {/* Results */}
      {species.length === 0 ? (
        <EmptyState variant="noResults" />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Nama Latin</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Siklus Pangkas (hari)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {species.map((plant) => (
                    <TableRow key={plant.id}>
                      <TableCell className="font-semibold">{plant.nameId}</TableCell>
                      <TableCell className="text-nb-gray-600">{plant.nameLatin || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" size="sm">
                          {CATEGORY_LABELS[plant.category] || plant.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-nb-gray-600">
                        {plant.defaultPruningCycleDays || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {!isSearching && totalPages > 1 && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-nb-body-sm text-nb-gray-600">
                Halaman {currentPage} dari {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={!canPrev}
                  leftIcon={<ChevronLeft className="size-4" />}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!canNext}
                  rightIcon={<ChevronRight className="size-4" />}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
