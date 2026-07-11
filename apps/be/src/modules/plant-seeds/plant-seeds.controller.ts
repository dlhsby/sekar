import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PlantSeedsService } from './plant-seeds.service';
import { PlantSeed } from './entities/plant-seed.entity';
import { SeedTransaction } from './entities/seed-transaction.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateSeedDto } from './dto/create-seed.dto';
import { UpdateSeedDto } from './dto/update-seed.dto';
import { RecordTransactionDto } from './dto/record-transaction.dto';
import { ListSeedsQueryDto } from './dto/list-seeds-query.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';

@ApiTags('Plant Seeds')
@ApiBearerAuth('JWT-auth')
@Controller('plant-seeds')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlantSeedsController {
  constructor(private readonly service: PlantSeedsService) {}

  @Get()
  @Roles(
    UserRole.ADMIN_RAYON,
    UserRole.KEPALA_RAYON,
    UserRole.MANAGEMENT,
    UserRole.ADMIN_SYSTEM,
    UserRole.SUPERADMIN,
  )
  @ApiOperation({ summary: 'List plant seeds' })
  @ApiResponse({ status: 200, description: 'List of seeds', type: [PlantSeed] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(@Query() query: ListSeedsQueryDto): Promise<{ items: PlantSeed[]; total: number }> {
    return this.service.findAll(query);
  }

  @Post()
  @Roles(UserRole.ADMIN_RAYON, UserRole.KEPALA_RAYON, UserRole.MANAGEMENT, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create new seed SKU' })
  @ApiResponse({ status: 201, description: 'Seed created', type: PlantSeed })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Conflict - Seed already exists' })
  async createSeed(@Body() dto: CreateSeedDto): Promise<PlantSeed> {
    return this.service.createSeed(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN_RAYON, UserRole.KEPALA_RAYON, UserRole.MANAGEMENT, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update seed master record metadata' })
  @ApiParam({ name: 'id', description: 'Seed ID' })
  @ApiResponse({ status: 200, description: 'Seed updated', type: PlantSeed })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Seed not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Seed name already exists' })
  async updateSeed(@Param('id') id: string, @Body() dto: UpdateSeedDto): Promise<PlantSeed> {
    return this.service.updateSeed(id, dto);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN_RAYON,
    UserRole.KEPALA_RAYON,
    UserRole.MANAGEMENT,
    UserRole.ADMIN_SYSTEM,
    UserRole.SUPERADMIN,
  )
  @ApiOperation({ summary: 'Get seed details' })
  @ApiParam({ name: 'id', description: 'Seed ID' })
  @ApiResponse({ status: 200, description: 'Seed details', type: PlantSeed })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Seed not found' })
  async findOne(@Param('id') id: string): Promise<PlantSeed> {
    return this.service.findOne(id);
  }

  @Post(':id/transactions')
  @Roles(UserRole.ADMIN_RAYON, UserRole.KEPALA_RAYON, UserRole.MANAGEMENT, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Record seed transaction' })
  @ApiParam({ name: 'id', description: 'Seed ID' })
  @ApiResponse({ status: 201, description: 'Transaction recorded' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Seed not found' })
  @ApiResponse({ status: 409, description: 'Insufficient stock' })
  async recordTransaction(
    @Param('id') seedId: string,
    @Body() dto: RecordTransactionDto,
    @GetUser() user: User,
  ): Promise<{ transaction: SeedTransaction; seed: PlantSeed }> {
    const dtoWithId = { ...dto, seedId };
    return this.service.recordTransaction(dtoWithId, user.id);
  }

  @Get(':id/transactions')
  @Roles(
    UserRole.ADMIN_RAYON,
    UserRole.KEPALA_RAYON,
    UserRole.MANAGEMENT,
    UserRole.ADMIN_SYSTEM,
    UserRole.SUPERADMIN,
  )
  @ApiOperation({ summary: 'Get seed transaction ledger' })
  @ApiParam({ name: 'id', description: 'Seed ID' })
  @ApiResponse({ status: 200, description: 'Transaction history' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Seed not found' })
  async getTransactions(
    @Param('id') seedId: string,
    @Query() query: ListTransactionsQueryDto,
  ): Promise<{ items: SeedTransaction[]; total: number }> {
    return this.service.getTransactions(seedId, query);
  }
}
