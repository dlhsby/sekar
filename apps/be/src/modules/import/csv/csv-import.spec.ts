import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

import { RedisService } from '../../../common/services/redis.service';
import { UsersService } from '../../users/users.service';
import { LocationsService } from '../../locations/locations.service';
import { Location } from '../../locations/entities/location.entity';
import { CsvImportService } from './csv-import.service';
import { parseCsv } from './csv-parser';
import { validateUsers, validateAreas } from './csv-validators';

const VALID_UUID = '11111111-1111-1111-1111-111111111111';

const asFile = (content: string): Express.Multer.File =>
  ({ buffer: Buffer.from(content, 'utf-8'), originalname: 'x.csv' }) as Express.Multer.File;

describe('parseCsv', () => {
  it('parses headers and rows, honouring quoted fields', () => {
    const { headers, rows } = parseCsv('a,b\n1,"x, y"\n2,z');
    expect(headers).toEqual(['a', 'b']);
    expect(rows).toEqual([
      { a: '1', b: 'x, y' },
      { a: '2', b: 'z' },
    ]);
  });

  it('ignores blank lines and a BOM', () => {
    const { rows } = parseCsv('﻿a,b\n1,2\n\n');
    expect(rows).toHaveLength(1);
  });

  it('throws on an empty file', () => {
    expect(() => parseCsv('   ')).toThrow('CSV file is empty');
  });
});

describe('validateUsers', () => {
  it('accepts a well-formed row', () => {
    const { valid, errors } = validateUsers([
      {
        username: 'satgas9',
        full_name: 'Budi Worker',
        phone_number: '+628123456789',
        role: 'satgas',
        password: 'Password123!',
      },
    ]);
    expect(errors).toHaveLength(0);
    expect(valid[0].username).toBe('satgas9');
  });

  it('accepts a row with the password omitted (temp password generated on import)', () => {
    const { valid, errors } = validateUsers([
      {
        username: 'satgas9',
        full_name: 'Budi Worker',
        phone_number: '+628123456789',
        role: 'satgas',
      },
    ]);
    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(1);
    expect(valid[0].password).toBeUndefined();
  });

  it('still rejects a supplied password shorter than 8 chars', () => {
    const { valid, errors } = validateUsers([
      {
        username: 'satgas9',
        full_name: 'Budi Worker',
        phone_number: '+628123456789',
        role: 'satgas',
        password: 'short',
      },
    ]);
    expect(valid).toHaveLength(0);
    expect(errors.some((e) => e.column === 'password')).toBe(true);
  });

  it('reports per-cell errors with line numbers (header is line 1)', () => {
    const { valid, errors } = validateUsers([
      { username: 'ab', full_name: 'X', phone_number: '0812', role: 'admin', password: 'short' },
    ]);
    expect(valid).toHaveLength(0);
    expect(errors.find((e) => e.column === 'role')?.row).toBe(2);
    expect(errors.map((e) => e.column)).toEqual(
      expect.arrayContaining(['username', 'full_name', 'role', 'password']),
    );
  });

  it('requires a phone number for field roles only', () => {
    const { errors } = validateUsers([
      {
        username: 'topmgr',
        full_name: 'Top Manager',
        role: 'top_management',
        password: 'Password123!',
      },
    ]);
    expect(errors).toHaveLength(0);
  });

  it('detects duplicate usernames within the CSV batch', () => {
    const { valid, errors } = validateUsers([
      {
        username: 'duplicate',
        full_name: 'First',
        phone_number: '+628123456789',
        role: 'satgas',
        password: 'Password123!',
      },
      {
        username: 'duplicate',
        full_name: 'Second',
        phone_number: '+628123456780',
        role: 'satgas',
        password: 'Password123!',
      },
    ]);
    expect(valid).toHaveLength(1); // First occurrence is valid
    expect(valid[0].full_name).toBe('First');
    expect(errors).toHaveLength(1);
    expect(errors[0].column).toBe('username');
    expect(errors[0].row).toBe(3); // Second row, but line 3 (header is line 1)
    expect(errors[0].message).toContain('Duplikat');
  });

  it('detects duplicate phone numbers within the CSV batch', () => {
    const { valid, errors } = validateUsers([
      {
        username: 'user1',
        full_name: 'User One',
        phone_number: '+628123456789',
        role: 'satgas',
        password: 'Password123!',
      },
      {
        username: 'user2',
        full_name: 'User Two',
        phone_number: '+628123456789',
        role: 'satgas',
        password: 'Password123!',
      },
    ]);
    expect(valid).toHaveLength(1);
    expect(valid[0].username).toBe('user1');
    expect(errors).toHaveLength(1);
    expect(errors[0].column).toBe('phone_number');
    expect(errors[0].row).toBe(3);
    expect(errors[0].message).toContain('Duplikat');
  });
});

describe('validateAreas', () => {
  it('accepts a row with valid coordinates and UUIDs', () => {
    const { valid, errors } = validateAreas([
      {
        name: 'Taman Baru',
        location_type_id: VALID_UUID,
        rayon_id: VALID_UUID,
        latitude: '-7.29',
        longitude: '112.73',
      },
    ]);
    expect(errors).toHaveLength(0);
    expect(valid[0].latitude).toBeCloseTo(-7.29);
  });

  it('rejects out-of-range coordinates', () => {
    const { valid, errors } = validateAreas([
      {
        name: 'Bad',
        location_type_id: VALID_UUID,
        rayon_id: VALID_UUID,
        latitude: '999',
        longitude: '0',
      },
    ]);
    expect(valid).toHaveLength(0);
    expect(errors.some((e) => e.column === 'latitude')).toBe(true);
  });

  it('detects duplicate area names within the CSV batch', () => {
    const { valid, errors } = validateAreas([
      {
        name: 'Taman Baru',
        location_type_id: VALID_UUID,
        rayon_id: VALID_UUID,
        latitude: '-7.29',
        longitude: '112.73',
      },
      {
        name: 'Taman Baru',
        location_type_id: VALID_UUID,
        rayon_id: VALID_UUID,
        latitude: '-7.30',
        longitude: '112.74',
      },
    ]);
    expect(valid).toHaveLength(1);
    expect(valid[0].latitude).toBeCloseTo(-7.29);
    expect(errors).toHaveLength(1);
    expect(errors[0].column).toBe('name');
    expect(errors[0].row).toBe(3);
    expect(errors[0].message).toContain('Duplikat');
  });
});

describe('CsvImportService', () => {
  let service: CsvImportService;
  let redisClient: { setex: jest.Mock; get: jest.Mock; del: jest.Mock };
  let usersService: { create: jest.Mock };
  let locationsService: { create: jest.Mock };
  let areaRepo: { update: jest.Mock };

  beforeEach(async () => {
    redisClient = { setex: jest.fn(), get: jest.fn(), del: jest.fn() };
    usersService = { create: jest.fn().mockResolvedValue({ id: 'u1' }) };
    locationsService = { create: jest.fn().mockResolvedValue({ id: 'a1' }) };
    areaRepo = { update: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsvImportService,
        { provide: RedisService, useValue: { getClient: () => redisClient } },
        { provide: UsersService, useValue: usersService },
        { provide: LocationsService, useValue: locationsService },
        { provide: getRepositoryToken(Location), useValue: areaRepo },
      ],
    }).compile();

    service = module.get(CsvImportService);
  });

  it('stores a session and returns its id when rows are valid', async () => {
    const file = asFile(
      'username,full_name,phone_number,role,password\nsatgas9,Budi,+628123456789,satgas,Password123!',
    );

    const result = await service.validate('users', file, 'user-1');

    expect(result.validCount).toBe(1);
    expect(result.sessionId).toBeDefined();
    expect(redisClient.setex).toHaveBeenCalledWith(
      `import:${result.sessionId}`,
      3600,
      expect.stringContaining('"userId":"user-1"'),
    );
  });

  it('omits the session when every row is invalid', async () => {
    const file = asFile('username,full_name,role,password\nab,X,admin,short');
    const result = await service.validate('users', file, 'user-1');
    expect(result.sessionId).toBeUndefined();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(redisClient.setex).not.toHaveBeenCalled();
  });

  it('rejects an empty upload', async () => {
    await expect(
      service.validate('users', undefined as unknown as Express.Multer.File, 'u'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('confirm', () => {
    const session = {
      userId: 'user-1',
      entityType: 'users',
      validRows: [
        { username: 'satgas9', full_name: 'Budi', role: 'satgas', password: 'Password123!' },
      ],
      createdAt: new Date().toISOString(),
    };

    it('inserts rows and deletes the session', async () => {
      redisClient.get.mockResolvedValue(JSON.stringify(session));

      const result = await service.confirm('sess-1', 'user-1');

      expect(usersService.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ imported: 1, skipped: 0, skippedReasons: [] });
      expect(redisClient.del).toHaveBeenCalledWith('import:sess-1');
    });

    it('surfaces auto-generated temp passwords as credentials for distribution', async () => {
      redisClient.get.mockResolvedValue(
        JSON.stringify({
          userId: 'user-1',
          entityType: 'users',
          // No password → create() generates one and returns it.
          validRows: [
            {
              username: 'satgas9',
              full_name: 'Budi',
              role: 'satgas',
              phone_number: '081234567890',
            },
          ],
          createdAt: new Date().toISOString(),
        }),
      );
      usersService.create.mockResolvedValue({
        id: 'u1',
        username: 'satgas9',
        phone_number: '081234567890',
        temp_password: 'X7k9m-Qp2rT',
      });

      const result = await service.confirm('sess-1', 'user-1');

      expect(result.imported).toBe(1);
      expect(result.credentials).toEqual([
        { username: 'satgas9', phone_number: '081234567890', temp_password: 'X7k9m-Qp2rT' },
      ]);
    });

    it('counts a failed insert as skipped with a reason', async () => {
      redisClient.get.mockResolvedValue(JSON.stringify(session));
      usersService.create.mockRejectedValue(new Error('Username already exists'));

      const result = await service.confirm('sess-1', 'user-1');

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.skippedReasons?.[0]).toContain('Username already exists');
    });

    it('404s for a missing/expired session', async () => {
      redisClient.get.mockResolvedValue(null);
      await expect(service.confirm('sess-1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('403s when the session belongs to another user', async () => {
      redisClient.get.mockResolvedValue(JSON.stringify({ ...session, userId: 'someone-else' }));
      await expect(service.confirm('sess-1', 'user-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('assigns rayon_id after creating an area', async () => {
      redisClient.get.mockResolvedValue(
        JSON.stringify({
          userId: 'user-1',
          entityType: 'areas',
          validRows: [
            {
              name: 'Taman',
              location_type_id: VALID_UUID,
              rayon_id: VALID_UUID,
              latitude: -7.29,
              longitude: 112.73,
            },
          ],
          createdAt: new Date().toISOString(),
        }),
      );

      const result = await service.confirm('sess-1', 'user-1');

      expect(locationsService.create).toHaveBeenCalledTimes(1);
      expect(areaRepo.update).toHaveBeenCalledWith('a1', { rayon_id: VALID_UUID });
      expect(result.imported).toBe(1);
    });
  });

  it('builds a template with the entity header row', () => {
    const { filename, content } = service.getTemplate('users');
    expect(filename).toBe('users-template.csv');
    expect(content).toContain('username,full_name');
  });
});
