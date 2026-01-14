import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { LocationService } from './location.service';
import { CreateLocationBatchDto } from './dto/create-location-batch.dto';
import { LocationLog } from './entities/location-log.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

/**
 * Location Controller
 *
 * Handles HTTP requests for GPS location tracking.
 * Workers send batch location pings, supervisors query location history.
 */
@ApiTags('location')
@ApiBearerAuth()
@Controller('location')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  /**
   * Batch upload location logs
   * Workers send multiple GPS pings at once
   */
  @Post('batch')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: 'Batch upload location logs (Worker only)' })
  @ApiResponse({
    status: 201,
    description: 'Locations uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input or shift not active' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  async createBatch(
    @Body() createLocationBatchDto: CreateLocationBatchDto,
    @GetUser() user: User,
  ): Promise<{ count: number }> {
    return this.locationService.createBatch(createLocationBatchDto, user.id);
  }

  /**
   * Get location history for a worker
   * Admin and Supervisor can view worker location history
   */
  @Get('worker/:workerId')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Get worker location history (Admin, Supervisor)' })
  @ApiParam({
    name: 'workerId',
    description: 'Worker UUID',
    type: String,
  })
  @ApiQuery({
    name: 'from_date',
    required: false,
    type: String,
    description: 'Start date (ISO format)',
  })
  @ApiQuery({
    name: 'to_date',
    required: false,
    type: String,
    description: 'End date (ISO format)',
  })
  @ApiQuery({
    name: 'shift_id',
    required: false,
    type: String,
    description: 'Filter by shift UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Location history (max 1000 records)',
    type: [LocationLog],
  })
  async getWorkerHistory(
    @Param('workerId') workerId: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
    @Query('shift_id') shiftId?: string,
  ): Promise<LocationLog[]> {
    return this.locationService.getWorkerHistory(workerId, {
      from_date: fromDate,
      to_date: toDate,
      shift_id: shiftId,
    });
  }

  /**
   * Get latest location for a worker
   * Admin and Supervisor can view worker's most recent location
   */
  @Get('worker/:workerId/latest')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Get latest worker location (Admin, Supervisor)' })
  @ApiParam({
    name: 'workerId',
    description: 'Worker UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Latest location log',
    type: LocationLog,
  })
  @ApiResponse({
    status: 404,
    description: 'No location found for worker',
  })
  async getLatestLocation(
    @Param('workerId') workerId: string,
  ): Promise<LocationLog | null> {
    return this.locationService.getLatestLocation(workerId);
  }
}
