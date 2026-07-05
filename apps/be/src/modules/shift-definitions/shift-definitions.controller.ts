import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ShiftDefinitionsService } from './shift-definitions.service';
import { ShiftDefinition } from './entities/shift-definition.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Controller for shift definition operations (read-only)
 *
 * All endpoints require authentication.
 * Shift definitions are fixed and not modifiable at runtime.
 */
@ApiTags('shift-definitions')
@ApiBearerAuth('JWT-auth')
@Controller('shift-definitions')
@UseGuards(JwtAuthGuard)
export class ShiftDefinitionsController {
  constructor(private readonly shiftDefinitionsService: ShiftDefinitionsService) {}

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
