import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ImportService } from './import.service';
import { Location } from '../locations/entities/location.entity';

describe('ImportService', () => {
  let service: ImportService;
  let areaRepository: jest.Mocked<Repository<Location>>;

  const mockArea: Location = {
    id: 'area-1',
    name: 'Test Location',
    location_type_id: 'type-1',
    areaType: {
      id: 'type-1',
      code: 'park',
      name: 'Taman',
      category: 'ACTIVE',
      description: 'Park',
      created_at: new Date(),
      updated_at: new Date(),
    },
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    radius_meters: 100,
    address: 'Test Address',
    is_active: true,
    rayon_id: 'rayon-1',
    coverage_area: 2500,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockFile = {
    buffer: Buffer.from(''),
    originalname: 'test.kml',
    fieldname: 'file',
    encoding: '7bit',
    mimetype: 'application/vnd.google-earth.kml+xml',
    size: 1000,
  } as Express.Multer.File;

  const simpleKmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Test Park</name>
      <description>A test park area</description>
      <Point>
        <coordinates>112.7398,-7.2905,0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;

  const polygonKmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Polygon Location</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              112.739,-7.291,0
              112.740,-7.291,0
              112.740,-7.290,0
              112.739,-7.290,0
              112.739,-7.291,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        {
          provide: getRepositoryToken(Location),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
    areaRepository = module.get(getRepositoryToken(Location));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadKmz', () => {
    it('should parse KML file and return session', async () => {
      const file = {
        ...mockFile,
        buffer: Buffer.from(simpleKmlContent),
      } as Express.Multer.File;

      areaRepository.find.mockResolvedValue([]);

      const result = await service.uploadKmz(file, 'user-1');

      expect(result).toHaveProperty('session_id');
      expect(result).toHaveProperty('total_areas', 1);
      expect(result).toHaveProperty('areas');
      expect(result.areas.length).toBe(1);
      expect(result.areas[0].name).toBe('Test Park');
      expect(result.areas[0].center.latitude).toBeCloseTo(-7.2905);
      expect(result.areas[0].center.longitude).toBeCloseTo(112.7398);
    });

    it('should throw error if no file uploaded', async () => {
      await expect(service.uploadKmz(null as any, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw error for invalid file type', async () => {
      const file = {
        ...mockFile,
        originalname: 'test.txt',
        buffer: Buffer.from('text content'),
      } as Express.Multer.File;

      await expect(service.uploadKmz(file, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should parse polygon areas with coverage calculation', async () => {
      const file = {
        ...mockFile,
        buffer: Buffer.from(polygonKmlContent),
      } as Express.Multer.File;

      areaRepository.find.mockResolvedValue([]);

      const result = await service.uploadKmz(file, 'user-1');

      expect(result.areas.length).toBe(1);
      expect(result.areas[0].name).toBe('Polygon Location');
      expect(result.areas[0].polygon).toBeDefined();
      expect(result.areas[0].polygon!.length).toBeGreaterThan(0);
      expect(result.areas[0].coverage_area).toBeGreaterThan(0);
    });

    it('should match existing areas by name', async () => {
      const file = {
        ...mockFile,
        buffer: Buffer.from(simpleKmlContent),
      } as Express.Multer.File;

      areaRepository.find.mockResolvedValue([{ ...mockArea, name: 'Test Park' }]);

      const result = await service.uploadKmz(file, 'user-1');

      expect(result.update_areas).toBe(1);
      expect(result.new_areas).toBe(0);
      expect(result.areas[0].match_status).toBe('update');
      expect(result.areas[0].existing_area_id).toBeDefined();
    });

    it('should identify new areas', async () => {
      const file = {
        ...mockFile,
        buffer: Buffer.from(simpleKmlContent),
      } as Express.Multer.File;

      areaRepository.find.mockResolvedValue([mockArea]); // Different name

      const result = await service.uploadKmz(file, 'user-1');

      expect(result.new_areas).toBe(1);
      expect(result.update_areas).toBe(0);
      expect(result.areas[0].match_status).toBe('new');
    });

    it('should set session expiration', async () => {
      const file = {
        ...mockFile,
        buffer: Buffer.from(simpleKmlContent),
      } as Express.Multer.File;

      areaRepository.find.mockResolvedValue([]);

      const result = await service.uploadKmz(file, 'user-1');

      expect(result.expires_at).toBeDefined();
      expect(result.expires_at.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('getPreview', () => {
    it('should return preview for valid session', async () => {
      const file = {
        ...mockFile,
        buffer: Buffer.from(simpleKmlContent),
      } as Express.Multer.File;

      areaRepository.find.mockResolvedValue([]);
      const uploadResult = await service.uploadKmz(file, 'user-1');

      const preview = await service.getPreview(uploadResult.session_id, 'user-1');

      expect(preview.session_id).toBe(uploadResult.session_id);
      expect(preview.areas).toEqual(uploadResult.areas);
    });

    it('should throw error for invalid session', async () => {
      await expect(service.getPreview('invalid-session', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error for wrong user', async () => {
      const file = {
        ...mockFile,
        buffer: Buffer.from(simpleKmlContent),
      } as Express.Multer.File;

      areaRepository.find.mockResolvedValue([]);
      const uploadResult = await service.uploadKmz(file, 'user-1');

      await expect(service.getPreview(uploadResult.session_id, 'user-2')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('confirmImport', () => {
    it('should create new areas', async () => {
      const file = {
        ...mockFile,
        buffer: Buffer.from(simpleKmlContent),
      } as Express.Multer.File;

      areaRepository.find.mockResolvedValue([]);
      areaRepository.save.mockResolvedValue({ ...mockArea, id: 'new-area-id' });

      const uploadResult = await service.uploadKmz(file, 'user-1');

      const result = await service.confirmImport(
        {
          session_id: uploadResult.session_id,
          areas: [
            {
              index: 0,
              action: 'create',
              location_type_id: 'type-1',
            },
          ],
        },
        'user-1',
      );

      expect(result.created).toBe(1);
      expect(result.results[0].action).toBe('created');
      expect(result.results[0].location_id).toBe('new-area-id');
    });

    it('should update existing areas', async () => {
      const file = {
        ...mockFile,
        buffer: Buffer.from(simpleKmlContent),
      } as Express.Multer.File;

      const existingArea = { ...mockArea, name: 'Test Park' };
      areaRepository.find.mockResolvedValue([existingArea]);
      areaRepository.findOne.mockResolvedValue(existingArea);
      areaRepository.save.mockResolvedValue(existingArea);

      const uploadResult = await service.uploadKmz(file, 'user-1');

      const result = await service.confirmImport(
        {
          session_id: uploadResult.session_id,
          areas: [
            {
              index: 0,
              action: 'update',
            },
          ],
        },
        'user-1',
      );

      expect(result.updated).toBe(1);
      expect(result.results[0].action).toBe('updated');
    });

    it('should skip areas when requested', async () => {
      const file = {
        ...mockFile,
        buffer: Buffer.from(simpleKmlContent),
      } as Express.Multer.File;

      areaRepository.find.mockResolvedValue([]);

      const uploadResult = await service.uploadKmz(file, 'user-1');

      const result = await service.confirmImport(
        {
          session_id: uploadResult.session_id,
          areas: [
            {
              index: 0,
              action: 'skip',
            },
          ],
        },
        'user-1',
      );

      expect(result.skipped).toBe(1);
      expect(result.results[0].action).toBe('skipped');
    });

    it('should handle invalid index', async () => {
      const file = {
        ...mockFile,
        buffer: Buffer.from(simpleKmlContent),
      } as Express.Multer.File;

      areaRepository.find.mockResolvedValue([]);

      const uploadResult = await service.uploadKmz(file, 'user-1');

      const result = await service.confirmImport(
        {
          session_id: uploadResult.session_id,
          areas: [
            {
              index: 999,
              action: 'create',
            },
          ],
        },
        'user-1',
      );

      expect(result.failed).toBe(1);
      expect(result.results[0].action).toBe('failed');
      expect(result.results[0].error).toContain('Invalid area index');
    });

    it('should throw error for invalid session', async () => {
      await expect(
        service.confirmImport(
          {
            session_id: 'invalid-session',
            areas: [],
          },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should apply name override', async () => {
      const file = {
        ...mockFile,
        buffer: Buffer.from(simpleKmlContent),
      } as Express.Multer.File;

      areaRepository.find.mockResolvedValue([]);
      let savedArea: any;
      areaRepository.save.mockImplementation((entity: any) => {
        savedArea = entity;
        return Promise.resolve({ ...mockArea, id: 'new-area-id' } as Location);
      });

      const uploadResult = await service.uploadKmz(file, 'user-1');

      await service.confirmImport(
        {
          session_id: uploadResult.session_id,
          areas: [
            {
              index: 0,
              action: 'create',
              name_override: 'Custom Name',
            },
          ],
        },
        'user-1',
      );

      expect(savedArea.name).toBe('Custom Name');
    });

    it('should delete session after confirm', async () => {
      const file = {
        ...mockFile,
        buffer: Buffer.from(simpleKmlContent),
      } as Express.Multer.File;

      areaRepository.find.mockResolvedValue([]);
      areaRepository.save.mockResolvedValue({ ...mockArea, id: 'new-area-id' });

      const uploadResult = await service.uploadKmz(file, 'user-1');

      await service.confirmImport(
        {
          session_id: uploadResult.session_id,
          areas: [{ index: 0, action: 'create' }],
        },
        'user-1',
      );

      // Session should be deleted after confirm
      await expect(service.getPreview(uploadResult.session_id, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('KML parsing edge cases', () => {
    it('should handle empty KML file', async () => {
      const emptyKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
  </Document>
</kml>`;

      const file = {
        ...mockFile,
        buffer: Buffer.from(emptyKml),
      } as Express.Multer.File;

      await expect(service.uploadKmz(file, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should handle nested folders', async () => {
      const nestedKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Folder>
      <name>Parent</name>
      <Folder>
        <name>Child</name>
        <Placemark>
          <name>Nested Location</name>
          <Point>
            <coordinates>112.7398,-7.2905,0</coordinates>
          </Point>
        </Placemark>
      </Folder>
    </Folder>
  </Document>
</kml>`;

      const file = {
        ...mockFile,
        buffer: Buffer.from(nestedKml),
      } as Express.Multer.File;

      areaRepository.find.mockResolvedValue([]);

      const result = await service.uploadKmz(file, 'user-1');

      expect(result.areas.length).toBe(1);
      expect(result.areas[0].name).toBe('Nested Location');
    });

    it('should handle multiple placemarks', async () => {
      const multiKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Location 1</name>
      <Point><coordinates>112.7398,-7.2905,0</coordinates></Point>
    </Placemark>
    <Placemark>
      <name>Location 2</name>
      <Point><coordinates>112.7400,-7.2900,0</coordinates></Point>
    </Placemark>
    <Placemark>
      <name>Location 3</name>
      <Point><coordinates>112.7402,-7.2895,0</coordinates></Point>
    </Placemark>
  </Document>
</kml>`;

      const file = {
        ...mockFile,
        buffer: Buffer.from(multiKml),
      } as Express.Multer.File;

      areaRepository.find.mockResolvedValue([]);

      const result = await service.uploadKmz(file, 'user-1');

      expect(result.total_areas).toBe(3);
      expect(result.areas.map((a) => a.name)).toEqual(['Location 1', 'Location 2', 'Location 3']);
    });

    it('should handle LineString as boundary', async () => {
      const lineKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Path Location</name>
      <LineString>
        <coordinates>
          112.739,-7.291,0 112.740,-7.291,0 112.740,-7.290,0 112.739,-7.290,0
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

      const file = {
        ...mockFile,
        buffer: Buffer.from(lineKml),
      } as Express.Multer.File;

      areaRepository.find.mockResolvedValue([]);

      const result = await service.uploadKmz(file, 'user-1');

      expect(result.areas.length).toBe(1);
      expect(result.areas[0].polygon).toBeDefined();
    });

    it('should skip placemarks without valid geometry', async () => {
      const invalidKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Valid Location</name>
      <Point><coordinates>112.7398,-7.2905,0</coordinates></Point>
    </Placemark>
    <Placemark>
      <name>Invalid Location</name>
      <description>No geometry</description>
    </Placemark>
  </Document>
</kml>`;

      const file = {
        ...mockFile,
        buffer: Buffer.from(invalidKml),
      } as Express.Multer.File;

      areaRepository.find.mockResolvedValue([]);

      const result = await service.uploadKmz(file, 'user-1');

      expect(result.total_areas).toBe(1);
      expect(result.areas[0].name).toBe('Valid Location');
    });
  });
});
