import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OvertimeService } from './overtime.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { RejectOvertimeDto } from './dto/reject-overtime.dto';
import { Overtime } from './entities/overtime.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import {
  OVERTIME_SUBMITTERS,
  OVERTIME_APPROVERS,
  USER_MANAGERS,
} from '../users/constants/role-groups';

/**
 * Overtime Controller
 *
 * Handles HTTP requests for overtime submission and approval.
 * Satgas/Linmas submit overtime, Korlap approves/rejects.
 */
@ApiTags('overtime')
@ApiBearerAuth()
@Controller('overtime')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OvertimeController {
  constructor(private readonly overtimeService: OvertimeService) {}

  /**
   * Submit overtime request
   * Satgas and Linmas only
   */
  @Post()
  @Roles(...OVERTIME_SUBMITTERS)
  @ApiOperation({
    summary: 'Submit overtime request (Satgas, Linmas)',
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

  /**
   * Get my overtime submissions
   * Satgas and Linmas only
   */
  @Get('my')
  @Roles(...OVERTIME_SUBMITTERS)
  @ApiOperation({
    summary: 'Get my overtime submissions (Satgas, Linmas)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user overtime submissions',
    type: [Overtime],
  })
  async findMy(@GetUser() user: User): Promise<Overtime[]> {
    return this.overtimeService.findMy(user.id);
  }

  /**
   * Get pending overtime for approval
   * Korlap and admin roles
   */
  @Get()
  @Roles(...OVERTIME_APPROVERS, ...USER_MANAGERS)
  @ApiOperation({
    summary: 'Get pending overtime for approval (Korlap, Admin)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of pending overtime submissions',
    type: [Overtime],
  })
  async findPending(@GetUser() user: User): Promise<Overtime[]> {
    return this.overtimeService.findPending(user.id, user.role);
  }

  /**
   * Get overtime by ID
   * Any authenticated user with access
   */
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

  /**
   * Approve overtime request
   * Korlap only
   */
  @Patch(':id/approve')
  @Roles(...OVERTIME_APPROVERS)
  @ApiOperation({ summary: 'Approve overtime (Korlap)' })
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
    description: 'Access denied - not your area or wrong role',
  })
  @ApiResponse({ status: 404, description: 'Overtime not found' })
  async approve(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<Overtime> {
    return this.overtimeService.approve(id, user.id, user.role);
  }

  /**
   * Reject overtime request
   * Korlap only
   */
  @Patch(':id/reject')
  @Roles(...OVERTIME_APPROVERS)
  @ApiOperation({ summary: 'Reject overtime (Korlap)' })
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
    return this.overtimeService.reject(id, user.id, user.role, rejectDto);
  }
}
