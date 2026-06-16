import { Injectable } from '@nestjs/common';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

@Injectable()
export class PerformanceScoreService {
  calculateScore(
    attendance: number,
    punctuality: number,
    taskCompletion: number,
    activitySubmission: number,
    activityApproval: number,
    areaCompliance: number,
  ): number {
    const score =
      attendance * 0.25 +
      punctuality * 0.15 +
      taskCompletion * 0.2 +
      activitySubmission * 0.15 +
      activityApproval * 0.1 +
      areaCompliance * 0.15;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  getGrade(score: number): Grade {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}
