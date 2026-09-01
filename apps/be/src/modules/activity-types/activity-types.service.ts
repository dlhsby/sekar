import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ArrayContains } from 'typeorm';
import { ActivityType } from './entities/activity-type.entity';
import { CreateActivityTypeDto } from './dto/create-activity-type.dto';
import { UpdateActivityTypeDto } from './dto/update-activity-type.dto';

/**
 * Service for managing activity types
 *
 * Activity types define the kinds of work that workers can perform.
 * They are role-specific (Worker, Linmas, or both).
 */
@Injectable()
export class ActivityTypesService {
  private readonly logger = new Logger(ActivityTypesService.name);

  constructor(
    @InjectRepository(ActivityType)
    private readonly activityTypeRepository: Repository<ActivityType>,
  ) {}

  /**
   * Get all active activity types
   *
   * @param role - Optional role filter (Worker, Linmas)
   * @returns Array of activity types, optionally filtered by role
   */
  async findAll(role?: string): Promise<ActivityType[]> {
    this.logger.log(`Fetching all activity types${role ? ` for role: ${role}` : ''}`);

    if (role) {
      // Filter by role using PostgreSQL array contains
      return this.activityTypeRepository.find({
        where: {
          is_active: true,
          applicable_roles: ArrayContains([role]),
        },
        order: { name: 'ASC' },
      });
    }

    return this.activityTypeRepository.find({
      where: { is_active: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Get activity types for a specific user role
   *
   * Returns activity types applicable to the user's role wrapped in a data object.
   * Used by mobile app to show only relevant activity types.
   *
   * @param role - User role (satgas, linmas, korlap, admin_rayon, etc.)
   * @returns Object containing array of activity types
   */
  async findByUserRole(role: string): Promise<{ data: ActivityType[] }> {
    this.logger.log(`Fetching activity types for user role: ${role}`);

    const activityTypes = await this.activityTypeRepository.find({
      where: {
        is_active: true,
        applicable_roles: ArrayContains([role]),
      },
      order: { name: 'ASC' },
    });

    this.logger.log(`Found ${activityTypes.length} activity types for role: ${role}`);
    return { data: activityTypes };
  }

  /**
   * Get a single activity type by ID
   *
   * @param id - Activity type ID (UUID)
   * @returns The activity type
   * @throws NotFoundException if activity type not found
   */
  async findOne(id: string): Promise<ActivityType> {
    this.logger.log(`Fetching activity type with ID: ${id}`);

    const activityType = await this.activityTypeRepository.findOne({
      where: { id },
    });

    if (!activityType) {
      this.logger.warn(`Activity type with ID ${id} not found`);
      throw new NotFoundException(`Activity type with ID ${id} not found`);
    }

    return activityType;
  }

  /**
   * Get an activity type by code
   *
   * @param code - Activity type code (e.g., WATERING, PLANTING)
   * @returns The activity type
   * @throws NotFoundException if activity type not found
   */
  async findByCode(code: string): Promise<ActivityType> {
    this.logger.log(`Fetching activity type with code: ${code}`);

    const activityType = await this.activityTypeRepository.findOne({
      where: { code, is_active: true },
    });

    if (!activityType) {
      this.logger.warn(`Activity type with code "${code}" not found`);
      throw new NotFoundException(`Activity type with code "${code}" not found`);
    }

    return activityType;
  }

  /**
   * Create a new activity type
   *
   * @param createActivityTypeDto - Activity type creation data
   * @returns The created activity type
   * @throws ConflictException if code already exists
   */
  async create(createActivityTypeDto: CreateActivityTypeDto): Promise<ActivityType> {
    this.logger.log(`Creating activity type with code: ${createActivityTypeDto.code}`);

    // Check if code already exists
    const existingActivityType = await this.activityTypeRepository.findOne({
      where: { code: createActivityTypeDto.code },
    });

    if (existingActivityType) {
      this.logger.warn(`Activity type with code "${createActivityTypeDto.code}" already exists`);
      throw new ConflictException(
        `Activity type with code "${createActivityTypeDto.code}" already exists`,
      );
    }

    const activityType = this.activityTypeRepository.create(createActivityTypeDto);
    const savedActivityType = await this.activityTypeRepository.save(activityType);

    this.logger.log(`Activity type created with ID: ${savedActivityType.id}`);
    return savedActivityType;
  }

  /**
   * Update an existing activity type
   *
   * @param id - Activity type ID (UUID)
   * @param updateActivityTypeDto - Activity type update data
   * @returns The updated activity type
   * @throws NotFoundException if activity type not found
   * @throws ConflictException if new code already exists
   */
  async update(id: string, updateActivityTypeDto: UpdateActivityTypeDto): Promise<ActivityType> {
    this.logger.log(`Updating activity type with ID: ${id}`);

    const activityType = await this.findOne(id);

    // If updating code, check for uniqueness
    if (updateActivityTypeDto.code && updateActivityTypeDto.code !== activityType.code) {
      const existingActivityType = await this.activityTypeRepository.findOne({
        where: { code: updateActivityTypeDto.code },
      });

      if (existingActivityType) {
        this.logger.warn(`Activity type with code "${updateActivityTypeDto.code}" already exists`);
        throw new ConflictException(
          `Activity type with code "${updateActivityTypeDto.code}" already exists`,
        );
      }
    }

    // Update only provided fields without mutating the loaded entity
    const updatedActivityType = await this.activityTypeRepository.save({
      ...activityType,
      ...updateActivityTypeDto,
    });

    this.logger.log(`Activity type updated with ID: ${updatedActivityType.id}`);
    return updatedActivityType;
  }

  /**
   * Soft delete an activity type
   *
   * @param id - Activity type ID (UUID)
   * @throws NotFoundException if activity type not found
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting activity type with ID: ${id}`);

    // First verify the activity type exists
    await this.findOne(id);

    // Perform soft delete
    await this.activityTypeRepository.softDelete(id);
    this.logger.log(`Activity type soft deleted with ID: ${id}`);
  }

  /**
   * Check if an activity type exists and is active
   *
   * @param id - Activity type ID (UUID)
   * @returns True if activity type exists and is active
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.activityTypeRepository.count({
      where: { id, is_active: true },
    });
    return count > 0;
  }

  /**
   * Check if a role can perform a specific activity type
   *
   * @param activityTypeId - Activity type ID (UUID)
   * @param role - User role (Worker, Linmas)
   * @returns True if the role can perform the activity
   */
  async canRolePerformActivity(activityTypeId: string, role: string): Promise<boolean> {
    const activityType = await this.findOne(activityTypeId);
    return activityType.applicable_roles.includes(role);
  }
}
