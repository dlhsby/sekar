import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Area } from '../../areas/entities/area.entity';
import { Rayon } from '../../rayons/entities/rayon.entity';
import { MonitoringCacheService } from './monitoring-cache.service';

interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

@Injectable()
export class RayonBoundaryService {
  private readonly logger = new Logger(RayonBoundaryService.name);

  constructor(
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
    @InjectRepository(Rayon)
    private readonly rayonRepository: Repository<Rayon>,
    private readonly cacheService: MonitoringCacheService,
  ) {}

  async recompute(rayonId: string): Promise<void> {
    const rayon = await this.rayonRepository.findOne({ where: { id: rayonId } });
    if (!rayon) {
      this.logger.warn(`Rayon ${rayonId} not found, skipping boundary recompute`);
      return;
    }

    const areas = await this.areaRepository.find({
      where: { rayon_id: rayonId },
      select: ['id', 'boundary_polygon'],
    });

    const allPoints = this.collectPoints(areas);

    if (allPoints.length < 3) {
      this.logger.debug(`Rayon ${rayonId}: fewer than 3 points, clearing boundary`);
      rayon.boundary_polygon = undefined;
      rayon.center_lat = undefined;
      rayon.center_lng = undefined;
      rayon.boundary_computed_at = new Date();
      await this.rayonRepository.save(rayon);
      return;
    }

    const hull = this.computeConvexHull(allPoints);
    const closedHull = [...hull, hull[0]];

    const polygon: GeoJsonPolygon = {
      type: 'Polygon',
      coordinates: [closedHull],
    };

    const centroid = this.computeCentroid(hull);

    rayon.boundary_polygon = polygon;
    rayon.center_lat = centroid.lat;
    rayon.center_lng = centroid.lng;
    rayon.boundary_computed_at = new Date();

    await this.rayonRepository.save(rayon);
    this.cacheService.invalidateAreaBoundary();

    this.logger.log(`Rayon ${rayonId} boundary recomputed from ${allPoints.length} points, hull has ${hull.length} vertices`);
  }

  private collectPoints(areas: Area[]): number[][] {
    const points: number[][] = [];

    for (const area of areas) {
      const polygon = area.boundary_polygon as GeoJsonPolygon | undefined;
      if (!polygon?.coordinates?.[0]) continue;

      for (const coord of polygon.coordinates[0]) {
        if (coord.length >= 2) {
          points.push([coord[0], coord[1]]);
        }
      }
    }

    return points;
  }

  computeConvexHull(points: number[][]): number[][] {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    if (sorted.length <= 2) return sorted;

    const lower: number[][] = [];
    for (const p of sorted) {
      while (lower.length >= 2 && this.cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
        lower.pop();
      }
      lower.push(p);
    }

    const upper: number[][] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i];
      while (upper.length >= 2 && this.cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
        upper.pop();
      }
      upper.push(p);
    }

    lower.pop();
    upper.pop();
    return [...lower, ...upper];
  }

  computeCentroid(polygon: number[][]): { lat: number; lng: number } {
    if (polygon.length === 0) return { lat: 0, lng: 0 };

    let sumLng = 0;
    let sumLat = 0;
    for (const [lng, lat] of polygon) {
      sumLng += lng;
      sumLat += lat;
    }

    return {
      lng: sumLng / polygon.length,
      lat: sumLat / polygon.length,
    };
  }

  private cross(o: number[], a: number[], b: number[]): number {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  }
}
