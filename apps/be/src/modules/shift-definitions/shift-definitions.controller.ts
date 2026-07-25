import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ShiftDefinitionsService } from './shift-definitions.service';
import { ShiftDefinition } from './entities/shift-definition.entity';
import { CreateShiftDefinitionDto } from './dto/create-shift-definition.dto';
import { UpdateShiftDefinitionDto } from './dto/update-shift-definition.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { USER_MANAGERS } from '../users/constants/role-groups';

/**
 * Controller for shift definition operations.
 *
 * Reads are open to any authenticated user; writes (ADR-055 configurable shifts)
 * are restricted to system managers. All endpoints require authentication.
 */
@ApiTags('shift-definitions')
@ApiBearerAuth('JWT-auth')
@Controller('shift-definitions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftDefinitionsController {
  constructor(private readonly shiftDefinitionsService: ShiftDefinitionsService) {}

  @Post()
  @Roles(...USER_MANAGERS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a shift definition (ADR-055)',
    description: 'Add a new shift type. System managers only.',
  })
  @ApiBody({ type: CreateShiftDefinitionDto })
  @ApiResponse({ status: 201, type: ShiftDefinition })
  @ApiResponse({ status: 409, description: 'Duplicate name or code' })
  create(@Body() dto: CreateShiftDefinitionDto): Promise<ShiftDefinition> {
    return this.shiftDefinitionsService.create(dto);
  }

  @Patch(':id')
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Update a shift definition (ADR-055)',
    description: 'Edit times / windows / active flag. System managers only.',
  })
  @ApiParam({ name: 'id', description: 'Shift definition UUID' })
  @ApiBody({ type: UpdateShiftDefinitionDto })
  @ApiResponse({ status: 200, type: ShiftDefinition })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'Duplicate name or code' })
  update(@Param('id') id: string, @Body() dto: UpdateShiftDefinitionDto): Promise<ShiftDefinition> {
    return this.shiftDefinitionsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(...USER_MANAGERS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete (soft) a shift definition (ADR-055)',
    description:
      'Soft-deletes so historical schedules/shifts/punches keep their reference. ' +
      'To merely stop offering a shift, set is_active=false instead. System managers only.',
  })
  @ApiParam({ name: 'id', description: 'Shift definition UUID' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.shiftDefinitionsService.remove(id);
  }

  /**
   * Get all shift definitions
   *
   * Returns all active shift definitions.
   * Any authenticated user can access this endpoint.
   *
   * @returns Array of shift definitions
   */
  @Get()
  @ApiOperation({
    summary: 'Get all shift definitions',
    description:
      'Returns all active shift definitions (Shift 1: 06:00-15:00, Shift 2: 15:00-23:00, Shift 3: 21:00-05:00). Any authenticated user can access this.',
  })
  @ApiResponse({
    status: 200,
    description: 'Shift definitions retrieved successfully',
    type: [ShiftDefinition],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  findAll(): Promise<ShiftDefinition[]> {
    return this.shiftDefinitionsService.findAll();
  }

  /**
   * Get the current shift based on current time
   *
   * Returns the shift definition that is currently active based on server time.
   *
   * @returns The current shift definition or null
   */
  @Get('current')
  @ApiOperation({
    summary: 'Get current shift',
    description: 'Returns the shift definition that is currently active based on server time',
  })
  @ApiResponse({
    status: 200,
    description: 'Current shift retrieved successfully (or null if outside shift hours)',
    type: ShiftDefinition,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  getCurrentShift(): Promise<ShiftDefinition | null> {
    return this.shiftDefinitionsService.getCurrentShift();
  }

  /**
   * Get a single shift definition by ID
   *
   * @param id - Shift definition ID (UUID)
   * @returns The shift definition
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get shift definition by ID',
    description: 'Returns a single shift definition by its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'Shift definition UUID',
    example: '22222222-2222-2222-2222-222222222201',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Shift definition retrieved successfully',
    type: ShiftDefinition,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Shift definition not found',
  })
  findOne(@Param('id') id: string): Promise<ShiftDefinition> {
    return this.shiftDefinitionsService.findOne(id);
  }
}
