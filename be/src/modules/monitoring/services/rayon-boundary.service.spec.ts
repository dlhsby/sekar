import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RayonBoundaryService } from './rayon-boundary.service';
import { Area } from '../../areas/entities/area.entity';
import { Rayon } from '../../rayons/entities/rayon.entity';
import { MonitoringCacheService } from './monitoring-cache.service';

describe('RayonBoundaryService', () => {
  let service: RayonBoundaryService;
  let areaRepository: any;
  let rayonRepository: any;
  let cacheService: any;

  const RAYON_ID = 'rayon-uuid-0001';

  const makeRayon = (overrides: Partial<Rayon> = {}): Rayon =>
    ({
      id: RAYON_ID,
      name: 'Rayon Selatan',
      code: 'SELATAN',
      boundary_polygon: undefined,
      center_lat: undefined,
      center_lng: undefined,
      boundary_computed_at: undefined,
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
      ...overrides,
    }) as Rayon;

  const makeArea = (coordinates: number[][][] | null): Partial<Area> => ({
    id: 'area-uuid-0001',
    boundary_polygon: coordinates ? { type: 'Polygon', coordinates } : undefined,
  });

  beforeEach(async () => {
    areaRepository = {
      find: jest.fn(),
    };

    rayonRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    cacheService = {
      invalidateAreaBoundary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RayonBoundaryService,
        { provide: getRepositoryToken(Area), useValue: areaRepository },
        { provide: getRepositoryToken(Rayon), useValue: rayonRepository },
        { provide: MonitoringCacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<RayonBoundaryService>(RayonBoundaryService);
  });

  // ---------------------------------------------------------------------------
  // recompute
  // ---------------------------------------------------------------------------

  describe('recompute', () => {
    it('should skip processing when rayon is not found', async () => {
      // Arrange
      rayonRepository.findOne.mockResolvedValue(null);

      // Act
      await service.recompute(RAYON_ID);

      // Assert — nothing should be persisted
      expect(areaRepository.find).not.toHaveBeenCalled();
      expect(rayonRepository.save).not.toHaveBeenCalled();
      expect(cacheService.invalidateAreaBoundary).not.toHaveBeenCalled();
    });

    it('should clear boundary fields and save when fewer than 3 points are collected', async () => {
      // Arrange — only 2 unique coordinate points across all areas
      rayonRepository.findOne.mockResolvedValue(makeRayon());
      areaRepository.find.mockResolvedValue([
        makeArea([
          [
            [112.74, -7.29],
            [112.75, -7.29],
          ],
        ]),
      ]);

      // Act
      await service.recompute(RAYON_ID);

      // Assert
      expect(rayonRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          boundary_polygon: undefined,
          center_lat: undefined,
          center_lng: undefined,
        }),
      );
      // Cache should NOT be invalidated when no boundary was produced
      expect(cacheService.invalidateAreaBoundary).not.toHaveBeenCalled();
    });

    it('should set boundary_computed_at even when fewer than 3 points exist', async () => {
      // Arrange
      rayonRepository.findOne.mockResolvedValue(makeRayon());
      areaRepository.find.mockResolvedValue([
        makeArea([
          [
            [112.74, -7.29],
            [112.75, -7.3],
          ],
        ]),
      ]);

      const before = new Date();

      // Act
      await service.recompute(RAYON_ID);

      // Assert
      const saved = rayonRepository.save.mock.calls[0][0] as Rayon;
      expect(saved.boundary_computed_at).toBeInstanceOf(Date);
      expect(saved.boundary_computed_at!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should compute a GeoJSON Polygon boundary from child area polygons', async () => {
      // Arrange — a simple square supplied via two areas
      rayonRepository.findOne.mockResolvedValue(makeRayon());
      areaRepository.find.mockResolvedValue([
        makeArea([
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ]),
        makeArea([
          [
            [0.2, 0.2],
            [0.8, 0.2],
            [0.8, 0.8],
            [0.2, 0.8],
            [0.2, 0.2],
          ],
        ]),
      ]);

      // Act
      await service.recompute(RAYON_ID);

      // Assert
      const saved = rayonRepository.save.mock.calls[0][0] as Rayon;
      const poly = saved.boundary_polygon as any;
      expect(poly).toBeDefined();
      expect(poly.type).toBe('Polygon');
      // Closed hull: first and last coordinate must be identical
      const ring: number[][] = poly.coordinates[0];
      expect(ring[0]).toEqual(ring[ring.length - 1]);
    });

    it('should update center_lat and center_lng to the hull centroid', async () => {
      // Arrange — axis-aligned square whose centroid is (0.5, 0.5)
      // In GeoJSON [lng, lat] order: lng=col, lat=row
      rayonRepository.findOne.mockResolvedValue(makeRayon());
      areaRepository.find.mockResolvedValue([
        makeArea([
          [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ],
        ]),
      ]);

      // Act
      await service.recompute(RAYON_ID);

      // Assert
      const saved = rayonRepository.save.mock.calls[0][0] as Rayon;
      // Hull of [0,0],[2,0],[2,2],[0,2] (last duplicate stripped) -> centroid lng=1, lat=1
      expect(saved.center_lng).toBeCloseTo(1, 5);
      expect(saved.center_lat).toBeCloseTo(1, 5);
    });

    it('should set boundary_computed_at to a recent timestamp after successful recompute', async () => {
      // Arrange
      rayonRepository.findOne.mockResolvedValue(makeRayon());
      areaRepository.find.mockResolvedValue([
        makeArea([
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ]),
      ]);

      const before = new Date();

      // Act
      await service.recompute(RAYON_ID);

      // Assert
      const saved = rayonRepository.save.mock.calls[0][0] as Rayon;
      expect(saved.boundary_computed_at).toBeInstanceOf(Date);
      expect(saved.boundary_computed_at!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should call invalidateAreaBoundary after a successful boundary save', async () => {
      // Arrange
      rayonRepository.findOne.mockResolvedValue(makeRayon());
      areaRepository.find.mockResolvedValue([
        makeArea([
          [
            [0, 0],
            [3, 0],
            [3, 3],
            [0, 3],
            [0, 0],
          ],
        ]),
      ]);
      rayonRepository.save.mockResolvedValue(undefined);

      // Act
      await service.recompute(RAYON_ID);

      // Assert
      expect(rayonRepository.save).toHaveBeenCalledTimes(1);
      expect(cacheService.invalidateAreaBoundary).toHaveBeenCalledTimes(1);
    });

    it('should skip areas that have no boundary_polygon and use only valid polygon points', async () => {
      // Arrange — one area has no polygon; the other supplies 4 unique corners
      rayonRepository.findOne.mockResolvedValue(makeRayon());
      areaRepository.find.mockResolvedValue([
        makeArea(null), // no polygon
        makeArea([
          [
            [10, 10],
            [20, 10],
            [20, 20],
            [10, 20],
            [10, 10],
          ],
        ]), // valid square
      ]);

      // Act
      await service.recompute(RAYON_ID);

      // Assert — boundary should still be computed from the valid area
      const saved = rayonRepository.save.mock.calls[0][0] as Rayon;
      const poly = saved.boundary_polygon as any;
      expect(poly).toBeDefined();
      expect(poly.type).toBe('Polygon');
    });
  });

  // ---------------------------------------------------------------------------
  // computeConvexHull
  // ---------------------------------------------------------------------------

  describe('computeConvexHull', () => {
    it('should return the original sorted points when the input has 2 or fewer points', () => {
      // Arrange
      const twoPoints = [
        [3, 1],
        [1, 2],
      ];

      // Act
      const result = service.computeConvexHull(twoPoints);

      // Assert — sorted by x then y
      expect(result).toEqual([
        [1, 2],
        [3, 1],
      ]);
    });

    it('should return the single input point unchanged when given exactly 1 point', () => {
      // Arrange
      const onePoint = [[5, 5]];

      // Act
      const result = service.computeConvexHull(onePoint);

      // Assert
      expect(result).toEqual([[5, 5]]);
    });

    it('should compute the correct convex hull vertices for an axis-aligned square', () => {
      // Arrange — four corners of a unit square plus the centre
      const square = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ];

      // Act
      const hull = service.computeConvexHull(square);

      // Assert — all four corners must appear in the hull
      expect(hull).toHaveLength(4);
      const hullSet = hull.map((p) => p.join(','));
      expect(hullSet).toContain('0,0');
      expect(hullSet).toContain('1,0');
      expect(hullSet).toContain('1,1');
      expect(hullSet).toContain('0,1');
    });

    it('should exclude interior points from the convex hull', () => {
      // Arrange — same square with an interior point at (0.5, 0.5)
      const pointsWithInterior = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0.5, 0.5], // interior — must NOT appear in the hull
      ];

      // Act
      const hull = service.computeConvexHull(pointsWithInterior);

      // Assert
      expect(hull).toHaveLength(4);
      const hullStr = hull.map((p) => p.join(','));
      expect(hullStr).not.toContain('0.5,0.5');
    });
  });

  // ---------------------------------------------------------------------------
  // computeCentroid
  // ---------------------------------------------------------------------------

  describe('computeCentroid', () => {
    it('should return the arithmetic mean of all vertex coordinates', () => {
      // Arrange — right-angle triangle with vertices [0,0], [4,0], [0,4]
      // Expected centroid: lng = (0+4+0)/3 ≈ 1.333, lat = (0+0+4)/3 ≈ 1.333
      const triangle = [
        [0, 0],
        [4, 0],
        [0, 4],
      ];

      // Act
      const centroid = service.computeCentroid(triangle);

      // Assert
      expect(centroid.lng).toBeCloseTo(4 / 3, 5);
      expect(centroid.lat).toBeCloseTo(4 / 3, 5);
    });

    it('should return { lat: 0, lng: 0 } for an empty polygon array', () => {
      // Act
      const centroid = service.computeCentroid([]);

      // Assert
      expect(centroid).toEqual({ lat: 0, lng: 0 });
    });
  });
});
