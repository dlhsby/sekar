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
import { OvertimeService } from './overtime.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { UpdateOvertimeDto } from './dto/update-overtime.dto';
import { StartOvertimeDto } from './dto/start-overtime.dto';
import { EndOvertimeDto } from './dto/end-overtime.dto';
import { RejectOvertimeDto } from './dto/reject-overtime.dto';
import { OvertimeFilterDto } from './dto/overtime-filter.dto';
import { Overtime } from './entities/overtime.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import {
  OVERTIME_SUBMITTERS,
  OVERTIME_APPROVERS,
  USER_MANAGERS,
  CLOCKABLE_ROLES,
} from '../users/constants/role-groups';

@ApiTags('overtime')
@ApiBearerAuth()
@Controller('overtime')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OvertimeController {
  constructor(private readonly overtimeService: OvertimeService) {}

  @Post('start')
  @Roles(...CLOCKABLE_ROLES)
  @ApiOperation({ summary: 'Start overtime (clock-in to overtime shift)' })
  @ApiResponse({ status: 201, description: 'Overtime started', type: Overtime })
  async startOvertime(@Body() dto: StartOvertimeDto, @GetUser() user: User): Promise<Overtime> {
    return this.overtimeService.startOvertime(dto, user);
  }

  @Post('end')
  @Roles(...CLOCKABLE_ROLES)
  @ApiOperation({ summary: 'End overtime (clock-out + activity submission)' })
  @ApiResponse({ status: 201, description: 'Overtime ended', type: Overtime })
  async endOvertime(@Body() dto: EndOvertimeDto, @GetUser() user: User): Promise<Overtime> {
    return this.overtimeService.endOvertime(dto, user);
  }

  @Get('active')
  @Roles(...CLOCKABLE_ROLES)
  @ApiOperation({ summary: 'Get active overtime for current user' })
  @ApiResponse({ status: 200, description: 'Active overtime or null' })
  async getActive(@GetUser() user: User): Promise<Overtime | null> {
    return this.overtimeService.getActiveOvertime(user.id);
  }

  @Post()
  @Roles(...OVERTIME_SUBMITTERS)
  @ApiOperation({
    summary: 'Submit overtime request (Satgas, Linmas, Korlap, AdminData)',
  })
  @ApiResponse({
    status: 201,
    description: 'Overtime submitted successfully',
    type: Overtime,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or activity type mismatch',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - role not allowed',
  })
  async submit(
    @Body() createOvertimeDto: CreateOvertimeDto,
    @GetUser() user: User,
  ): Promise<Overtime> {
    return this.overtimeService.submit(user.id, user.role, createOvertimeDto);
  }

  @Get('my')
  @Roles(...OVERTIME_SUBMITTERS)
  @ApiOperation({
    summary: 'Get my overtime submissions (paginated)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of user overtime submissions',
  })
  async findMy(
    @GetUser() user: User,
    @Query() filterDto: OvertimeFilterDto,
  ): Promise<PaginatedResponseDto<Overtime>> {
    return this.overtimeService.findMyPaginated(user.id, filterDto);
  }

  @Get()
  @Roles(...OVERTIME_APPROVERS, ...USER_MANAGERS, UserRole.ADMIN_RAYON)
  @ApiOperation({
    summary: 'Get all overtime (paginated, role-scoped)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of overtime submissions',
  })
  async findAll(
    @GetUser() user: User,
    @Query() filterDto: OvertimeFilterDto,
  ): Promise<PaginatedResponseDto<Overtime>> {
    return this.overtimeService.findAllPaginated(user.id, user.role, filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get overtime details' })
  @ApiResponse({
    status: 200,
    description: 'Overtime details',
    type: Overtime,
  })
  @ApiResponse({ status: 404, description: 'Overtime not found' })
  async findOne(@Param('id') id: string): Promise<Overtime> {
    return this.overtimeService.findOne(id);
  }

  @Patch(':id/approve')
  @Roles(...OVERTIME_APPROVERS)
  @ApiOperation({ summary: 'Approve overtime (Korlap, Kepala Rayon)' })
  @ApiResponse({
    status: 200,
    description: 'Overtime approved successfully',
    type: Overtime,
  })
  @ApiResponse({
    status: 400,
    description: 'Only pending overtime can be approved',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - not your area/rayon or wrong role',
  })
  @ApiResponse({ status: 404, description: 'Overtime not found' })
  async approve(@Param('id') id: string, @GetUser() user: User): Promise<Overtime> {
    return this.overtimeService.approve(id, user.id);
  }

  @Patch(':id/reject')
  @Roles(...OVERTIME_APPROVERS)
  @ApiOperation({ summary: 'Reject overtime (Korlap, Kepala Rayon)' })
  @ApiResponse({
    status: 200,
    description: 'Overtime rejected successfully',
    type: Overtime,
  })
  @ApiResponse({
    status: 400,
    description: 'Only pending overtime can be rejected',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Overtime not found' })
  async reject(
    @Param('id') id: string,
    @Body() rejectDto: RejectOvertimeDto,
    @GetUser() user: User,
  ): Promise<Overtime> {
    return this.overtimeService.reject(id, user.id, rejectDto);
  }

  @Patch(':id')
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'Update overtime (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Overtime updated successfully',
    type: Overtime,
  })
  @ApiResponse({ status: 404, description: 'Overtime not found' })
  async update(
    @Param('id') id: string,
    @Body() updateOvertimeDto: UpdateOvertimeDto,
  ): Promise<Overtime> {
    return this.overtimeService.update(id, updateOvertimeDto);
  }

  @Delete(':id')
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'Delete overtime (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Overtime deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Overtime not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.overtimeService.remove(id);
  }
}
