import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PruningRequest } from './entities/pruning-request.entity';
import { CreatePruningRequestDto } from './dto/create-pruning-request.dto';
import { User, UserRole } from '../users/entities/user.entity';

/**
 * Service for managing pruning requests.
 *
 * Handles submission by `staff_kecamatan` users, retrieval with proper authorization,
 * and status tracking. Review/convert/disposition endpoints are deferred.
 */
@Injectable()
export class PruningRequestsService {
  private readonly logger = new Logger(PruningRequestsService.name);

  constructor(
    @InjectRepository(PruningRequest)
    private readonly pruningRequestRepository: Repository<PruningRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Submit a new pruning request.
   *
   * Sets status to 'submitted', captures submitter info, GPS, and photo keys.
   * Generates a unique reference code.
   *
   * @param dto - Pruning request creation data
   * @param user - Authenticated user submitting the request (should be staff_kecamatan)
   * @returns The created pruning request
   */
  async create(
    dto: CreatePruningRequestDto,
    user: User,
  ): Promise<PruningRequest> {
    this.logger.log(`Creating pruning request from user ${user.id}`);

    // Validate detail_date is today or future
    const detailDate = new Date(dto.detail_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (detailDate < today) {
      throw new BadRequestException(
        'Detail date must be today or in the future',
      );
    }

    // Generate unique reference code (timestamp-based for readability)
    const referenceCode = `PR-${Date.now()}-${uuidv4().slice(0, 8)}`;

    const pruningRequest = this.pruningRequestRepository.create({
      referenceCode,
      submittedBy: user.id,
      kecamatanName: user.full_name, // Use submitter's name as kecamatan identifier
      address: dto.address,
      gpsLat: dto.lat,
      gpsLng: dto.lng,
      photoUrls: dto.photo_keys,
      expectedDate: detailDate,
      estimatedPlantCount: dto.target_count,
      notes: dto.notes || null,
      status: 'submitted',
      rayonId: dto.rayon_id || null,
    });

    const saved = await this.pruningRequestRepository.save(pruningRequest);
    this.logger.log(
      `Pruning request ${saved.id} created with reference code ${saved.referenceCode}`,
    );

    return saved;
  }

  /**
   * Get pruning requests submitted by the authenticated user.
   *
   * @param user - Authenticated user
   * @param limit - Maximum results (default 20)
   * @param offset - Pagination offset (default 0)
   * @returns Array of pruning requests created by the user
   */
  async findMine(
    user: User,
    limit = 20,
    offset = 0,
  ): Promise<PruningRequest[]> {
    this.logger.log(
      `Fetching pruning requests for user ${user.id} (limit ${limit}, offset ${offset})`,
    );

    return this.pruningRequestRepository.find({
      where: { submittedBy: user.id },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get a single pruning request by ID with authorization checks.
   *
   * Access allowed to:
   * - The submitter (owner)
   * - admin_data users with matching rayon_id
   * - kepala_rayon users with matching rayon_id
   * - top_management users (read-all)
   * - admin_system users (read-all)
   * - superadmin users (read-all)
   *
   * @param id - Pruning request ID
   * @param user - Authenticated user
   * @returns The pruning request
   * @throws NotFoundException if request not found
   * @throws ForbiddenException if user lacks authorization
   */
  async findById(id: string, user: User): Promise<PruningRequest> {
    this.logger.log(
      `Fetching pruning request ${id} for user ${user.id} (role: ${user.role})`,
    );

    const request = await this.pruningRequestRepository.findOne({
      where: { id },
    });

    if (!request) {
      this.logger.warn(`Pruning request ${id} not found`);
      throw new NotFoundException(`Pruning request with ID ${id} not found`);
    }

    // Check authorization
    const isOwner = request.submittedBy === user.id;
    const isAdmin = [
      UserRole.ADMIN_DATA,
      UserRole.ADMIN_SYSTEM,
      UserRole.SUPERADMIN,
      UserRole.TOP_MANAGEMENT,
      UserRole.KEPALA_RAYON,
    ].includes(user.role as UserRole);
    const rayonMatches = request.rayonId === user.rayon_id;
    const isUnrestrictedAdmin = [
      UserRole.ADMIN_SYSTEM,
      UserRole.SUPERADMIN,
      UserRole.TOP_MANAGEMENT,
    ].includes(user.role as UserRole);

    const hasAccess =
      isOwner ||
      isUnrestrictedAdmin ||
      (isAdmin && rayonMatches && request.rayonId !== null);

    if (!hasAccess) {
      this.logger.warn(
        `Access denied for user ${user.id} to request ${id}. Submitter: ${request.submittedBy}, Request rayon: ${request.rayonId}, User rayon: ${user.rayon_id}`,
      );
      throw new ForbiddenException(
        'You do not have permission to access this pruning request',
      );
    }

    return request;
  }
}
