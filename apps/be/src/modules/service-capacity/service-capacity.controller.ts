import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ServiceCapacityService } from './service-capacity.service';
import { ServiceCapacity } from './entities/service-capacity.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { QueryCapacityDto } from './dto/query-capacity.dto';
import { UpsertCapacityDto } from './dto/upsert-capacity.dto';
import { BookCapacityDto } from './dto/book-capacity.dto';

@ApiTags('Service Capacity')
@ApiBearerAuth('JWT-auth')
@Controller('rayons/:rayonId/capacity')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceCapacityController {
  constructor(private readonly service: ServiceCapacityService) {}

  @Get()
  @Roles(
    UserRole.ADMIN_RAYON,
    UserRole.KEPALA_RAYON,
    UserRole.MANAGEMENT,
    UserRole.SUPERADMIN,
    UserRole.ADMIN_SYSTEM,
    UserRole.STAFF_KECAMATAN,
  )
  @ApiOperation({
    summary: 'Get service capacity calendar',
    description:
      'Retrieve capacity and booking info for a rayon. admin_rayon and staff_kecamatan are scoped to own rayon.',
  })
  @ApiParam({ name: 'rayonId', description: 'Rayon ID' })
  @ApiResponse({
    status: 200,
    description: 'Capacity records (filled with placeholders for missing weeks)',
    type: [ServiceCapacity],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cross-rayon access' })
  async findCalendar(
    @Param('rayonId') rayonId: string,
    @Query() query: QueryCapacityDto,
    @GetUser() user: User,
  ): Promise<ServiceCapacity[]> {
    const scopedRoles = [UserRole.ADMIN_RAYON, UserRole.STAFF_KECAMATAN];
    if (scopedRoles.includes(user.role as UserRole) && user.rayon_id !== rayonId) {
      throw new ForbiddenException('Cannot access other rayon');
    }

    return this.service.findCalendar({
      rayonId,
      ...query,
    });
  }

  @Put()
  @Roles(UserRole.KEPALA_RAYON, UserRole.MANAGEMENT, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Override capacity units',
    description: 'Set capacity units for a week/service-type. admin_rayon cannot override.',
  })
  @ApiParam({ name: 'rayonId', description: 'Rayon ID' })
  @ApiResponse({
    status: 200,
    description: 'Updated capacity record',
    type: ServiceCapacity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin_rayon cannot override' })
  async upsertCapacity(
    @Param('rayonId') rayonId: string,
    @Body() dto: UpsertCapacityDto,
  ): Promise<ServiceCapacity> {
    return this.service.upsertCapacity({
      rayonId,
      ...dto,
    });
  }

  @Post('book')
  @Roles(UserRole.KEPALA_RAYON, UserRole.MANAGEMENT, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Book capacity units',
    description: 'Atomically book units; throws ConflictException if capacity exceeded.',
  })
  @ApiParam({ name: 'rayonId', description: 'Rayon ID' })
  @ApiResponse({
    status: 201,
    description: 'Updated capacity record',
    type: ServiceCapacity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Conflict - Capacity exceeded' })
  async bookCapacity(
    @Param('rayonId') rayonId: string,
    @Body() dto: BookCapacityDto,
  ): Promise<ServiceCapacity> {
    return this.service.bookAtomic({
      rayonId,
      ...dto,
    });
  }
}
