import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

/**
 * Application Root Controller
 *
 * Provides basic API information and health check endpoints.
 */
@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Get API information.
   *
   * @route GET /api
   * @returns API metadata including name, version, and status
   */
  @Get()
  @ApiOperation({
    summary: 'Get API information',
    description: 'Returns basic information about the SEKAR API including version and status.',
  })
  @ApiResponse({
    status: 200,
    description: 'API information retrieved successfully.',
    schema: {
      example: {
        message: 'SEKAR Backend API',
        version: '1.0.0',
        status: 'running',
      },
    },
  })
  getHello(): object {
    return this.appService.getHello();
  }

  /**
   * Health check endpoint.
   *
   * @route GET /api/health
   * @returns Health status including timestamp, uptime, and environment
   */
  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description:
      'Check if the API is running and get system information including uptime and environment.',
  })
  @ApiResponse({
    status: 200,
    description: 'API is healthy and running.',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-01-07T10:00:00.000Z',
        uptime: 12345.67,
        environment: 'development',
      },
    },
  })
  healthCheck(): object {
    return this.appService.healthCheck();
  }
}
