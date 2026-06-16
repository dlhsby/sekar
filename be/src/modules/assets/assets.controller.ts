import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { Asset } from './entities/asset.entity';
import { AssetCategory } from './entities/asset-category.entity';
import { AssetAssignment } from './entities/asset-assignment.entity';
import { AssetMaintenance } from './entities/asset-maintenance.entity';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { QueryAssetDto } from './dto/query-asset.dto';
import { CheckoutAssetDto } from './dto/checkout-asset.dto';
import { ReturnAssetDto } from './dto/return-asset.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { BulkQrDto } from './dto/bulk-qr.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import {
  ASSET_MANAGERS,
  ASSET_USERS,
  ASSET_VIEWERS,
} from '../users/constants/role-groups';

@ApiTags('assets')
@ApiBearerAuth()
@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Get all asset categories' })
  @ApiResponse({ status: 200, description: 'List of categories', type: [AssetCategory] })
  async getCategories(): Promise<AssetCategory[]> {
    return this.assetsService.findCategories();
  }

  @Get('my-assets')
  @Roles(...ASSET_USERS)
  @ApiOperation({ summary: 'Get current user active assets' })
  @ApiResponse({ status: 200, description: 'Active assignments', type: [AssetAssignment] })
  async getMyAssets(@GetUser() user: User): Promise<AssetAssignment[]> {
    return this.assetsService.myAssets(user);
  }

  @Get('scan/:code')
  @ApiOperation({ summary: 'Scan asset by code' })
  @ApiResponse({ status: 200, description: 'Asset details', type: Asset })
  async scanByCode(@Param('code') code: string): Promise<Asset> {
    return this.assetsService.scanByCode(code);
  }

  @Get('maintenance/calendar')
  @Roles(...ASSET_VIEWERS)
  @ApiOperation({ summary: 'Get maintenance calendar for month' })
  @ApiResponse({ status: 200, description: 'Maintenance records', type: [AssetMaintenance] })
  async maintenanceCalendar(
    @Query('month') month: number,
    @Query('year') year: number,
    @GetUser() user: User,
  ): Promise<AssetMaintenance[]> {
    return this.assetsService.maintenanceCalendar({ month, year }, user);
  }

  @Get('maintenance/overdue')
  @Roles(...ASSET_VIEWERS)
  @ApiOperation({ summary: 'Get overdue maintenance' })
  @ApiResponse({ status: 200, description: 'Overdue maintenance records', type: [AssetMaintenance] })
  async overdueMaintenance(@GetUser() user: User): Promise<AssetMaintenance[]> {
    return this.assetsService.overdueMaintenance(user);
  }

  @Get()
  @Roles(...ASSET_VIEWERS)
  @ApiOperation({ summary: 'List assets (paginated, role-scoped)' })
  @ApiResponse({ status: 200, description: 'Paginated assets' })
  async list(
    @Query() query: QueryAssetDto,
    @GetUser() user: User,
  ): Promise<PaginatedResponseDto<Asset>> {
    return this.assetsService.findAll(user, query);
  }

  @Get(':id')
  @Roles(...ASSET_VIEWERS)
  @ApiOperation({ summary: 'Get asset by id' })
  @ApiResponse({ status: 200, description: 'Asset details', type: Asset })
  async getById(@Param('id') id: string, @GetUser() user: User): Promise<Asset> {
    return this.assetsService.findOne(id, user);
  }

  @Post()
  @Roles(...ASSET_MANAGERS)
  @ApiOperation({ summary: 'Create asset' })
  @ApiResponse({ status: 201, description: 'Asset created', type: Asset })
  async create(
    @Body() dto: CreateAssetDto,
    @GetUser() user: User,
  ): Promise<Asset> {
    return this.assetsService.create(dto, user);
  }

  @Patch(':id')
  @Roles(...ASSET_MANAGERS)
  @ApiOperation({ summary: 'Update asset' })
  @ApiResponse({ status: 200, description: 'Asset updated', type: Asset })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
    @GetUser() user: User,
  ): Promise<Asset> {
    return this.assetsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(...ASSET_MANAGERS)
  @ApiOperation({ summary: 'Delete asset (soft delete)' })
  @ApiResponse({ status: 200, description: 'Asset deleted' })
  async delete(@Param('id') id: string, @GetUser() user: User): Promise<void> {
    return this.assetsService.softDelete(id, user);
  }

  @Post(':id/qr')
  @Roles(...ASSET_MANAGERS)
  @ApiOperation({ summary: 'Generate QR code for asset' })
  @ApiResponse({ status: 201, description: 'QR code generated', schema: { properties: { url: { type: 'string' } } } })
  async generateQr(@Param('id') id: string): Promise<{ url: string }> {
    const url = await this.assetsService.generateQr(id);
    return { url };
  }

  @Post('qr/bulk')
  @Roles(...ASSET_MANAGERS)
  @ApiOperation({ summary: 'Generate QR codes for multiple assets' })
  @ApiResponse({ status: 201, description: 'QR codes generated' })
  async generateBulkQr(
    @Body() dto: BulkQrDto,
  ): Promise<{ assetId: string; assetCode: string; qrCodeUrl: string }[]> {
    return this.assetsService.generateBulkQr(dto.asset_ids);
  }

  @Post(':id/checkout')
  @Roles(...ASSET_USERS)
  @ApiOperation({ summary: 'Checkout asset' })
  @ApiResponse({ status: 201, description: 'Asset checked out', type: AssetAssignment })
  async checkout(
    @Param('id') id: string,
    @Body() dto: CheckoutAssetDto,
    @GetUser() user: User,
  ): Promise<AssetAssignment> {
    return this.assetsService.checkout(id, dto, user);
  }

  @Post(':id/return')
  @Roles(...ASSET_USERS)
  @ApiOperation({ summary: 'Return asset' })
  @ApiResponse({ status: 200, description: 'Asset returned', type: AssetAssignment })
  async returnAsset(
    @Param('id') id: string,
    @Body() dto: ReturnAssetDto,
    @GetUser() user: User,
  ): Promise<AssetAssignment> {
    return this.assetsService.returnAsset(id, dto, user);
  }

  @Get(':id/assignments')
  @Roles(...ASSET_VIEWERS)
  @ApiOperation({ summary: 'Get asset assignments' })
  @ApiResponse({ status: 200, description: 'Assignment history', type: [AssetAssignment] })
  async getAssignments(@Param('id') id: string, @GetUser() user: User): Promise<AssetAssignment[]> {
    return this.assetsService.listAssignments(id, user);
  }

  @Post(':id/maintenance')
  @Roles(...ASSET_MANAGERS)
  @ApiOperation({ summary: 'Create maintenance record' })
  @ApiResponse({ status: 201, description: 'Maintenance created', type: AssetMaintenance })
  async createMaintenance(
    @Param('id') id: string,
    @Body() dto: CreateMaintenanceDto,
    @GetUser() user: User,
  ): Promise<AssetMaintenance> {
    return this.assetsService.createMaintenance(id, dto, user);
  }

  @Patch('maintenance/:id')
  @Roles(...ASSET_MANAGERS)
  @ApiOperation({ summary: 'Update maintenance record' })
  @ApiResponse({ status: 200, description: 'Maintenance updated', type: AssetMaintenance })
  async updateMaintenance(
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceDto,
    @GetUser() user: User,
  ): Promise<AssetMaintenance> {
    return this.assetsService.updateMaintenance(id, dto, user);
  }
}
