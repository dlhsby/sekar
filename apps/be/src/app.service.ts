import { Injectable } from '@nestjs/common';
import { getBuildInfo } from './common/build-info';

@Injectable()
export class AppService {
  getHello(): object {
    const build = getBuildInfo();
    return {
      message: 'SEKAR Backend API',
      version: build.version,
      gitSha: build.gitSha,
      builtAt: build.builtAt,
      status: 'running',
    };
  }

  healthCheck(): object {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
