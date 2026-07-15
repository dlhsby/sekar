import { Location } from './location.entity';
import { LocationType } from '../../location-types/entities/location-type.entity';

describe('Location Entity', () => {
  it('should be defined', () => {
    const area = new Location();
    expect(area).toBeDefined();
  });

  it('should have all required properties', () => {
    const area = new Location();

    area.id = 'area-uuid-123';
    area.name = 'Test Location';
    area.location_type_id = 'type-uuid-456';
    area.gps_lat = -7.2905;
    area.gps_lng = 112.7398;
    area.radius_meters = 100;
    area.address = 'Test Address';
    area.is_active = true;
    area.created_at = new Date();
    area.updated_at = new Date();

    expect(area.id).toBe('area-uuid-123');
    expect(area.name).toBe('Test Location');
    expect(area.location_type_id).toBe('type-uuid-456');
    expect(area.gps_lat).toBe(-7.2905);
    expect(area.gps_lng).toBe(112.7398);
    expect(area.radius_meters).toBe(100);
    expect(area.address).toBe('Test Address');
    expect(area.is_active).toBe(true);
    expect(area.created_at).toBeInstanceOf(Date);
    expect(area.updated_at).toBeInstanceOf(Date);
  });

  it('should support locationType relation', () => {
    const area = new Location();
    const mockAreaType: LocationType = {
      id: 'type-uuid-456',
      code: 'park',
      name: 'Taman',
      description: 'Park area',
      category: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: undefined,
    };

    area.locationType = mockAreaType;
    expect(area.locationType).toBe(mockAreaType);
    expect(area.locationType.code).toBe('park');
    expect(area.locationType.name).toBe('Taman');
  });

  it('should create area with all properties and relation', () => {
    const area = new Location();
    const mockAreaType: LocationType = {
      id: 'type-uuid-456',
      code: 'park',
      name: 'Taman',
      description: 'Park area',
      category: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: undefined,
    };

    area.id = 'area-uuid-123';
    area.name = 'Taman Bungkul';
    area.location_type_id = mockAreaType.id;
    area.locationType = mockAreaType;
    area.gps_lat = -7.2905;
    area.gps_lng = 112.7398;
    area.radius_meters = 150;
    area.address = 'Jl. Taman Bungkul, Darmo, Surabaya';
    area.is_active = true;
    area.created_at = new Date();
    area.updated_at = new Date();

    expect(area.id).toBe('area-uuid-123');
    expect(area.name).toBe('Taman Bungkul');
    expect(area.location_type_id).toBe(mockAreaType.id);
    expect(area.locationType).toBe(mockAreaType);
    expect(area.gps_lat).toBe(-7.2905);
    expect(area.gps_lng).toBe(112.7398);
    expect(area.radius_meters).toBe(150);
    expect(area.is_active).toBe(true);
  });

  it('should support inactive areas', () => {
    const area = new Location();
    area.is_active = false;

    expect(area.is_active).toBe(false);
  });

  it('should handle different GPS coordinates', () => {
    const area = new Location();
    area.gps_lat = -7.3037;
    area.gps_lng = 112.7375;

    expect(area.gps_lat).toBe(-7.3037);
    expect(area.gps_lng).toBe(112.7375);
  });
});
