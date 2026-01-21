import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaginationDto, PaginatedResponseDto, PaginationMeta } from './pagination.dto';

describe('PaginationDto', () => {
  describe('validation', () => {
    it('should accept valid pagination parameters', async () => {
      const dto = plainToInstance(PaginationDto, { page: 1, limit: 50 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(50);
    });

    it('should use default values when not provided', async () => {
      const dto = plainToInstance(PaginationDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(50);
    });

    it('should reject page number less than 1', async () => {
      const dto = plainToInstance(PaginationDto, { page: 0, limit: 50 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('page');
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should reject limit less than 1', async () => {
      const dto = plainToInstance(PaginationDto, { page: 1, limit: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should reject limit greater than 100', async () => {
      const dto = plainToInstance(PaginationDto, { page: 1, limit: 101 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('max');
    });

    it('should accept limit at maximum boundary (100)', async () => {
      const dto = plainToInstance(PaginationDto, { page: 1, limit: 100 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.limit).toBe(100);
    });

    it('should transform string numbers to integers', async () => {
      const dto = plainToInstance(PaginationDto, { page: '2', limit: '25' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(25);
      expect(typeof dto.page).toBe('number');
      expect(typeof dto.limit).toBe('number');
    });
  });
});

describe('PaginatedResponseDto', () => {
  describe('constructor', () => {
    it('should create paginated response with correct metadata', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const total = 150;
      const page = 1;
      const limit = 50;

      const response = new PaginatedResponseDto(data, total, page, limit);

      expect(response.data).toEqual(data);
      expect(response.meta.total).toBe(150);
      expect(response.meta.page).toBe(1);
      expect(response.meta.limit).toBe(50);
      expect(response.meta.totalPages).toBe(3);
    });

    it('should calculate totalPages correctly when total is not evenly divisible', () => {
      const data: Array<{ id: number }> = [];
      const total = 125;
      const page = 1;
      const limit = 50;

      const response = new PaginatedResponseDto<{ id: number }>(data, total, page, limit);

      expect(response.meta.totalPages).toBe(3); // Math.ceil(125 / 50) = 3
    });

    it('should handle empty results', () => {
      const data: Array<{ id: number }> = [];
      const total = 0;
      const page = 1;
      const limit = 50;

      const response = new PaginatedResponseDto<{ id: number }>(data, total, page, limit);

      expect(response.data).toEqual([]);
      expect(response.meta.total).toBe(0);
      expect(response.meta.totalPages).toBe(0);
    });

    it('should handle single page results', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const total = 2;
      const page = 1;
      const limit = 50;

      const response = new PaginatedResponseDto(data, total, page, limit);

      expect(response.data.length).toBe(2);
      expect(response.meta.total).toBe(2);
      expect(response.meta.totalPages).toBe(1);
    });

    it('should work with different page numbers', () => {
      const data = [{ id: 51 }, { id: 52 }];
      const total = 150;
      const page = 2;
      const limit = 50;

      const response = new PaginatedResponseDto(data, total, page, limit);

      expect(response.meta.page).toBe(2);
      expect(response.meta.total).toBe(150);
      expect(response.meta.totalPages).toBe(3);
    });

    it('should handle last page with fewer items', () => {
      const data = [{ id: 101 }]; // Only 1 item on last page
      const total = 101;
      const page = 3;
      const limit = 50;

      const response = new PaginatedResponseDto(data, total, page, limit);

      expect(response.data.length).toBe(1);
      expect(response.meta.page).toBe(3);
      expect(response.meta.totalPages).toBe(3); // Math.ceil(101 / 50) = 3
    });
  });
});

describe('PaginationMeta', () => {
  it('should have correct structure', () => {
    const meta: PaginationMeta = {
      total: 100,
      page: 1,
      limit: 50,
      totalPages: 2,
    };

    expect(meta).toHaveProperty('total');
    expect(meta).toHaveProperty('page');
    expect(meta).toHaveProperty('limit');
    expect(meta).toHaveProperty('totalPages');
  });
});
