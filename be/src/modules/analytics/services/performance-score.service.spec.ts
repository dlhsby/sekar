import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceScoreService } from './performance-score.service';

describe('PerformanceScoreService', () => {
  let service: PerformanceScoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceScoreService],
    }).compile();

    service = module.get<PerformanceScoreService>(PerformanceScoreService);
  });

  describe('calculateScore', () => {
    it('should calculate weighted average correctly', () => {
      const score = service.calculateScore(100, 100, 100, 100, 100, 100);
      expect(score).toBe(100);
    });

    it('should apply correct weights', () => {
      const score = service.calculateScore(100, 0, 0, 0, 0, 0);
      expect(score).toBe(25);
    });

    it('should clamp score to 0-100', () => {
      const scoreHigh = service.calculateScore(150, 150, 150, 150, 150, 150);
      const scoreLow = service.calculateScore(-50, -50, -50, -50, -50, -50);
      expect(scoreHigh).toBe(100);
      expect(scoreLow).toBe(0);
    });

    it('should handle mixed values', () => {
      const score = service.calculateScore(90, 85, 80, 75, 70, 95);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('getGrade', () => {
    it('should return A for score >= 90', () => {
      expect(service.getGrade(90)).toBe('A');
      expect(service.getGrade(95)).toBe('A');
      expect(service.getGrade(100)).toBe('A');
    });

    it('should return B for score >= 80', () => {
      expect(service.getGrade(80)).toBe('B');
      expect(service.getGrade(85)).toBe('B');
      expect(service.getGrade(89)).toBe('B');
    });

    it('should return C for score >= 70', () => {
      expect(service.getGrade(70)).toBe('C');
      expect(service.getGrade(75)).toBe('C');
      expect(service.getGrade(79)).toBe('C');
    });

    it('should return D for score >= 60', () => {
      expect(service.getGrade(60)).toBe('D');
      expect(service.getGrade(65)).toBe('D');
      expect(service.getGrade(69)).toBe('D');
    });

    it('should return F for score < 60', () => {
      expect(service.getGrade(0)).toBe('F');
      expect(service.getGrade(30)).toBe('F');
      expect(service.getGrade(59)).toBe('F');
    });
  });
});
