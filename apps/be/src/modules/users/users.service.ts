import {
  Injectable,
  NotFoundException,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { AuthService } from '../auth/auth.service';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { UserValidationService } from './services/user-validation.service';
import { AuditLogService } from '../audit/audit.service';
import { UserAreasService } from '../user-areas/user-areas.service';
import { generateTempPassword } from '../../common/utils/password.util';

/** A user plus a one-time plaintext password (only present on create/reset). */
export type UserWithTempPassword = User & { temp_password?: string };

/** A single reset outcome: the identity plus the one-time temp password. */
export interface ResetCredential {
  id: string;
  username: string;
  phone_number: string | null;
  temp_password: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly authService: AuthService,
    // Phase 4-7 (H2): uniqueness validation extracted from CRUD methods
    private readonly userValidation: UserValidationService,
    // Phase 4-4 (C2): account mutations are audit-logged
    private readonly auditLogService: AuditLogService,
    // Simplified assignment: rayon + permanent areas + one shift set in user mgmt
    private readonly userAreasService: UserAreasService,
  ) {}

  /** Fire-and-forget audit write — account changes must never fail on logging */
  private audit(params: Parameters<AuditLogService['log']>[0]): void {
    this.auditLogService
      .log(params)
      .catch((err: Error) => this.logger.error(`Audit log failed: ${err.message}`));
  }

  /**
   * Create a new user
   * @param createUserDto User creation data
   * @returns Created user entity
   * @throws ConflictException if username already exists
   */
  async create(createUserDto: CreateUserDto, actor?: User): Promise<UserWithTempPassword> {
    const {
      username,
      password,
      full_name,
      role,
      phone_number,
      rayon_id,
      region_id,
      shift_definition_id,
    } = createUserDto;
    const areaIds = [...new Set(createUserDto.area_ids ?? [])];

    this.logger.log(`Creating new user: ${username}`);

    await this.userValidation.assertUsernameAvailable(username);
    if (phone_number) {
      await this.userValidation.assertPhoneAvailable(phone_number);
    }

    // Admins don't own the user's real password: when none is supplied we
    // generate a one-time temp password. Whether the password is auto-generated
    // OR explicitly supplied (e.g. CSV import), it is only a bootstrap credential
    // — always force a change on first login so a value the worker never chose
    // can't become their standing password. (Regression: UAT CSV imports created
    // users with `password_must_change=false` + passwords nobody knew, locking
    // them out.)
    const tempPassword = password ? undefined : generateTempPassword();
    const password_hash = await this.authService.hashPassword(password ?? tempPassword!);

    const user = this.userRepository.create({
      username,
      password_hash,
      full_name,
      role,
      phone_number: phone_number || null,
      password_must_change: true,
      rayon_id: rayon_id ?? undefined,
      region_id: region_id ?? undefined,
      shift_definition_id: shift_definition_id ?? undefined,
      // Primary area = first assigned area (legacy `users.area_id` fallback).
      area_id: areaIds[0] ?? undefined,
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`User created successfully: ${username} (ID: ${savedUser.id})`);

    // Permanent area membership (multi) drives monitoring scope + geofence.
    if (areaIds.length) {
      await this.userAreasService.reconcilePermanentAreas(
        savedUser.id,
        areaIds,
        actor?.id ?? savedUser.id,
      );
    }

    this.audit({
      entity_type: 'user',
      entity_id: savedUser.id,
      action: 'create',
      actor_id: actor?.id ?? savedUser.id, // self-attributed for internal callers (e.g. CSV import w/o actor)
      new_value: {
        username,
        full_name,
        role,
        rayon_id,
        region_id,
        shift_definition_id,
        area_ids: areaIds,
      },
    });

    return tempPassword ? Object.assign(savedUser, { temp_password: tempPassword }) : savedUser;
  }

  /**
   * Admin password reset: generate a new one-time temp password, force a change
   * on next login, and (best-effort) the caller's clients drop the old session.
   * Returns the plaintext temp password once — it is never stored.
   */
  async resetPassword(id: string, actor?: User): Promise<{ temp_password: string }> {
    const { temp_password } = await this.resetOne(id, actor);
    return { temp_password };
  }

  /** Reset one user to a fresh temp password + forced change; returns the credential. */
  private async resetOne(id: string, actor?: User): Promise<ResetCredential> {
    const user = await this.findOne(id);
    const tempPassword = generateTempPassword();
    user.password_hash = await this.authService.hashPassword(tempPassword);
    user.password_must_change = true;
    await this.userRepository.save(user);
    this.logger.log(`Password reset for user ID ${id} by ${actor?.id ?? 'system'}`);
    this.audit({
      entity_type: 'user',
      entity_id: id,
      action: 'reset_password',
      actor_id: actor?.id ?? id,
      new_value: { password_must_change: true },
    });
    return {
      id,
      username: user.username,
      phone_number: user.phone_number ?? null,
      temp_password: tempPassword,
    };
  }

  /**
   * Find all users (without sensitive data)
   * @returns Array of users
   */
  async findAll(): Promise<User[]> {
    this.logger.log('Fetching all users');
    return this.userRepository.find({
      select: [
        'id',
        'username',
        'full_name',
        'role',
        'is_active',
        'area_id',
        'rayon_id',
        'region_id',
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
      ],
    });
  }

  /**
   * Find users by roles
   * @param roles Array of user roles to filter by
   * @returns Array of users with specified roles
   */
  async findByRoles(roles: string[]): Promise<User[]> {
    this.logger.log(`Fetching users by roles: ${roles.join(', ')}`);
    return this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.username', 'user.full_name', 'user.role', 'user.is_active'])
      .where('user.role IN (:...roles)', { roles })
      .andWhere('user.is_active = :isActive', { isActive: true })
      .getMany();
  }

  /**
   * Find all users with pagination (without sensitive data)
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Paginated users
   */
  async findAllPaginated(
    page: number = 1,
    limit: number = 50,
    requestingUser?: User,
  ): Promise<PaginatedResponseDto<User>> {
    this.logger.log(`Fetching users with pagination: page=${page}, limit=${limit}`);

    // Rayon-scoped roles see only users in their rayon.
    // May 11, 2026 — switched from `area.rayon_id` (which required users to
    // have an `area_id` set) to `user.rayon_id` directly. The old form
    // excluded rayon-scoped roles (`admin_rayon`, `kepala_rayon`) and any
    // satgas/korlap not yet placed in an area, so the Tugaskan ke Petugas
    // assignee dropdown rendered "Tidak ada Admin Data di rayon ini" even
    // when those users existed in the rayon. We OR the area-derived
    // rayon too so satgas with only an `area_id` (no direct `rayon_id`)
    // still appear — defensive for legacy rows.
    if (
      requestingUser &&
      (requestingUser.role === UserRole.ADMIN_RAYON ||
        requestingUser.role === UserRole.KEPALA_RAYON) &&
      requestingUser.rayon_id
    ) {
      const qb = this.userRepository
        .createQueryBuilder('user')
        .leftJoin('user.area', 'area')
        .select([
          'user.id',
          'user.username',
          'user.full_name',
          'user.role',
          'user.is_active',
          'user.area_id',
          'user.rayon_id',
          'user.region_id',
          'user.phone_number',
          'user.shift_definition_id',
          'user.profile_picture_url',
          'user.password_must_change',
          'user.created_at',
          'user.updated_at',
          'user.created_by',
          'user.updated_by',
        ])
        .where('(user.rayon_id = :rayonId OR area.rayon_id = :rayonId)', {
          rayonId: requestingUser.rayon_id,
        })
        .orderBy('user.created_at', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [data, total] = await qb.getManyAndCount();
      return new PaginatedResponseDto(await this.withAreaCounts(data), total, page, limit);
    }

    const [data, total] = await this.userRepository.findAndCount({
      select: [
        'id',
        'username',
        'full_name',
        'role',
        'is_active',
        'area_id',
        'rayon_id',
        'region_id',
        'phone_number',
        'shift_definition_id',
        'profile_picture_url',
        'password_must_change',
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
      ],
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return new PaginatedResponseDto(await this.withAreaCounts(data), total, page, limit);
  }

  /**
   * Attach `assigned_area_count` + `assigned_area_ids` (permanent area
   * assignments) to each user for the management grid's Area column — one
   * batched query per page, no N+1. Full area detail (name, boundary, etc.)
   * is still loaded lazily via GET /users/:id/areas; this is IDs only, so the
   * grid can filter by area.
   */
  private async withAreaCounts(users: User[]): Promise<User[]> {
    if (!users.length) return users;
    const byUser = await this.userAreasService.getPermanentAreaIdsForUsers(users.map((u) => u.id));
    for (const user of users) {
      const areaIds = byUser.get(user.id) ?? [];
      user.assigned_area_count = areaIds.length;
      user.assigned_area_ids = areaIds;
    }
    return users;
  }

  /**
   * Find user by ID
   * @param id User ID (UUID)
   * @returns User entity
   * @throws NotFoundException if user not found
   */
  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'username',
        'full_name',
        'role',
        'is_active',
        'area_id',
        'rayon_id',
        'region_id',
        'phone_number',
        'shift_definition_id',
        'profile_picture_url',
        'password_must_change',
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
      ],
    });

    if (!user) {
      this.logger.warn(`User not found: ID ${id}`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Find user by username
   * @param username Username to search for
   * @returns User entity or null if not found
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
    });
  }

  /**
   * Update user information
   * @param id User ID (UUID)
   * @param updateUserDto Updated user data
   * @returns Updated user entity
   * @throws NotFoundException if user not found
   */
  async update(id: string, updateUserDto: UpdateUserDto, actor?: User): Promise<User> {
    this.logger.log(`Updating user: ID ${id}`);
    const user = await this.findOne(id);
    const previous = { full_name: user.full_name, role: user.role, is_active: user.is_active };

    // Admins cannot set passwords here — use resetPassword (generate + force change).
    // `area_ids` is a junction-table relation (not a column) — handle separately.
    const { phone_number, area_ids, ...updateData } = updateUserDto;

    if (phone_number) {
      await this.userValidation.assertPhoneAvailable(phone_number, id);
    }

    // Reassignment = editing the user's permanent areas. Past shifts/tracking
    // history are immutable; today/future use the new set.
    let areaChange: { added: string[]; removed: string[] } | undefined;
    let primaryAreaId: string | undefined;
    if (area_ids) {
      const desired = [...new Set(area_ids)];
      const before = await this.userAreasService.getPermanentAreaIds(id);
      areaChange = await this.userAreasService.reconcilePermanentAreas(
        id,
        desired,
        actor?.id ?? id,
      );
      primaryAreaId = desired[0]; // may be undefined → clears primary
      if (areaChange.added.length || areaChange.removed.length) {
        this.audit({
          entity_type: 'user',
          entity_id: id,
          action: 'reassign',
          actor_id: actor?.id ?? id,
          old_value: { area_ids: before },
          new_value: { area_ids: desired },
        });
      }
    }

    // area_id may be cleared to null when all areas are removed → loose payload.
    const savePayload: Record<string, unknown> = {
      ...user,
      ...updateData,
      ...(phone_number !== undefined ? { phone_number } : {}),
      ...(area_ids ? { area_id: primaryAreaId ?? null } : {}),
    };
    const savedUser = await this.userRepository.save(savePayload as unknown as User);
    this.logger.log(`User updated successfully: ID ${id}`);

    this.audit({
      entity_type: 'user',
      entity_id: id,
      action: 'update',
      actor_id: actor?.id ?? id,
      old_value: previous,
      new_value: {
        ...updateData,
        ...(area_ids ? { area_ids: [...new Set(area_ids)] } : {}),
      },
    });

    return savedUser;
  }

  /**
   * Soft delete a user — sets deleted_at (+ deleted_by via AuditSubscriber) so
   * the row leaves the default queries. Distinct from deactivation.
   * @param id User ID (UUID)
   * @throws NotFoundException if user not found
   */
  async remove(id: string, actor?: User): Promise<void> {
    this.logger.log(`Soft deleting user: ID ${id}`);
    const user = await this.findOne(id);
    await this.userRepository.softRemove(user);
    this.logger.log(`User soft deleted: ID ${id}`);

    this.audit({
      entity_type: 'user',
      entity_id: id,
      action: 'delete',
      actor_id: actor?.id ?? id,
    });
  }

  /**
   * Deactivate a user (is_active=false) — the account is kept and can be
   * reactivated; the user simply can't log in. Distinct from deletion.
   */
  async deactivate(id: string, actor?: User): Promise<User> {
    const user = await this.findOne(id);
    if (!user.is_active) return user;
    user.is_active = false;
    const saved = await this.userRepository.save(user);
    this.audit({
      entity_type: 'user',
      entity_id: id,
      action: 'deactivate',
      actor_id: actor?.id ?? id,
      old_value: { is_active: true },
      new_value: { is_active: false },
    });
    return saved;
  }

  /** Reactivate a previously deactivated user (is_active=true). */
  async activate(id: string, actor?: User): Promise<User> {
    const user = await this.findOne(id);
    if (user.is_active) return user;
    user.is_active = true;
    const saved = await this.userRepository.save(user);
    this.audit({
      entity_type: 'user',
      entity_id: id,
      action: 'activate',
      actor_id: actor?.id ?? id,
      old_value: { is_active: false },
      new_value: { is_active: true },
    });
    return saved;
  }

  /**
   * Hard delete user (permanently remove from database)
   * For testing purposes only
   * @param id User ID (UUID)
   * @throws NotFoundException if user not found
   */
  async hardRemove(id: string): Promise<void> {
    this.logger.warn(`Hard deleting user: ID ${id}`);
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
    this.logger.warn(`User hard deleted: ID ${id}`);
  }

  /**
   * Change user password
   * @param userId User ID (UUID)
   * @param currentPassword Current password for verification
   * @param newPassword New password to set
   * @throws NotFoundException if user not found
   * @throws UnauthorizedException if current password is incorrect
   * @throws BadRequestException if new password is same as current
   */
  async updateProfilePicture(id: string, url: string): Promise<void> {
    await this.userRepository.update(id, { profile_picture_url: url });
    this.logger.log(`Profile picture updated for user: ID ${id}`);
  }

  /**
   * Update current user's own profile (name and phone only)
   * @param userId User ID (UUID)
   * @param updateMyProfileDto Profile data (full_name, phone_number only)
   * @returns Updated user entity (without password)
   * @throws NotFoundException if user not found
   * @throws ConflictException if phone number already in use
   */
  async updateOwnProfile(userId: string, updateMyProfileDto: UpdateMyProfileDto): Promise<User> {
    this.logger.log(`User ${userId} updating their own profile`);

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'username',
        'full_name',
        'phone_number',
        'role',
        'is_active',
        'profile_picture_url',
        'created_at',
        'updated_at',
      ],
    });

    if (!user) {
      this.logger.warn(`Profile update failed: User not found - ID ${userId}`);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Validate phone uniqueness if provided
    if (updateMyProfileDto.phone_number && updateMyProfileDto.phone_number !== user.phone_number) {
      await this.userValidation.assertPhoneAvailable(updateMyProfileDto.phone_number, userId);
    }

    // Update only allowed fields
    if (updateMyProfileDto.full_name !== undefined) {
      user.full_name = updateMyProfileDto.full_name.trim();
    }
    if (updateMyProfileDto.phone_number !== undefined) {
      user.phone_number = updateMyProfileDto.phone_number;
    }
    if (updateMyProfileDto.preferred_language !== undefined) {
      user.preferred_language = updateMyProfileDto.preferred_language;
    }

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`User profile updated: ID ${userId}`);

    return savedUser;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    this.logger.log(`Password change attempt for user: ID ${userId}`);

    // Find user with password hash
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'username', 'password_hash', 'is_active'],
    });

    if (!user) {
      this.logger.warn(`Password change failed: User not found - ID ${userId}`);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      this.logger.warn(`Password change failed: Incorrect current password - ID ${userId}`);
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Ensure new password is different from current (additional check beyond DTO validation)
    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) {
      this.logger.warn(`Password change failed: New password same as current - ID ${userId}`);
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash and update password
    const newPasswordHash = await this.authService.hashPassword(newPassword);
    user.password_hash = newPasswordHash;
    await this.userRepository.save(user);

    this.logger.log(`Password changed successfully for user: ID ${userId}`);
  }
}
