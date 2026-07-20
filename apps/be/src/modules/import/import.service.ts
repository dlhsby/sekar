import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import JSZip from 'jszip';
import * as xml2js from 'xml2js';
import { v4 as uuidv4 } from 'uuid';
import { Location } from '../locations/entities/location.entity';
import {
  ParsedAreaDto,
  KmzUploadResponseDto,
  KmzConfirmRequestDto,
  KmzConfirmResponseDto,
  AreaImportResultDto,
} from './dto/kmz-import.dto';

interface ImportSession {
  areas: ParsedAreaDto[];
  expiresAt: Date;
  userId: string;
}

/**
 * Service for importing areas from KMZ/KML files
 */
@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private readonly sessions: Map<string, ImportSession> = new Map();
  private readonly SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

  constructor(
    @InjectRepository(Location)
    private readonly areaRepository: Repository<Location>,
  ) {}

  /**
   * Parse uploaded KMZ file and create preview session
   */
  async uploadKmz(file: Express.Multer.File, userId: string): Promise<KmzUploadResponseDto> {
    this.logger.log(`Processing KMZ upload from user: ${userId}`);

    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded');
    }

    // Check file type - accept both KMZ and KML
    const isKmz = file.originalname.toLowerCase().endsWith('.kmz');
    const isKml = file.originalname.toLowerCase().endsWith('.kml');

    if (!isKmz && !isKml) {
      throw new BadRequestException('File must be KMZ or KML format');
    }

    let kmlContent: string;

    if (isKmz) {
      // Extract KML from KMZ (which is a ZIP file)
      kmlContent = await this.extractKmlFromKmz(file.buffer);
    } else {
      // Read KML directly
      kmlContent = file.buffer.toString('utf-8');
    }

    // Parse KML to extract areas
    const parsedAreas = await this.parseKml(kmlContent);

    if (parsedAreas.length === 0) {
      throw new BadRequestException(
        'No areas found in the file. The file must contain Placemark elements.',
      );
    }

    // Match with existing areas
    await this.matchExistingAreas(parsedAreas);

    // Create session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + this.SESSION_TTL_MS);

    this.sessions.set(sessionId, {
      areas: parsedAreas,
      expiresAt,
      userId,
    });

    // Cleanup expired sessions
    this.cleanupExpiredSessions();

    const newAreas = parsedAreas.filter((a) => a.match_status === 'new').length;
    const updateAreas = parsedAreas.filter((a) => a.match_status === 'update').length;

    return {
      session_id: sessionId,
      total_areas: parsedAreas.length,
      new_areas: newAreas,
      update_areas: updateAreas,
      areas: parsedAreas,
      expires_at: expiresAt,
    };
  }

  /**
   * Get preview of parsed areas from session
   */
  async getPreview(sessionId: string, userId: string): Promise<KmzUploadResponseDto> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException('Import session not found or expired');
    }

    if (session.userId !== userId) {
      throw new NotFoundException('Import session not found or expired');
    }

    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      throw new NotFoundException('Import session expired');
    }

    const newAreas = session.areas.filter((a) => a.match_status === 'new').length;
    const updateAreas = session.areas.filter((a) => a.match_status === 'update').length;

    return {
      session_id: sessionId,
      total_areas: session.areas.length,
      new_areas: newAreas,
      update_areas: updateAreas,
      areas: session.areas,
      expires_at: session.expiresAt,
    };
  }

  /**
   * Confirm and execute the import
   */
  async confirmImport(dto: KmzConfirmRequestDto, userId: string): Promise<KmzConfirmResponseDto> {
    const session = this.sessions.get(dto.session_id);

    if (!session) {
      throw new NotFoundException('Import session not found or expired');
    }

    if (session.userId !== userId) {
      throw new NotFoundException('Import session not found or expired');
    }

    if (session.expiresAt < new Date()) {
      this.sessions.delete(dto.session_id);
      throw new NotFoundException('Import session expired');
    }

    const results: AreaImportResultDto[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const selection of dto.areas) {
      if (selection.index < 0 || selection.index >= session.areas.length) {
        results.push({
          name: `Index ${selection.index}`,
          action: 'failed',
          error: 'Invalid area index',
        });
        failed++;
        continue;
      }

      const parsedArea = session.areas[selection.index];

      if (selection.action === 'skip') {
        results.push({
          name: parsedArea.name,
          action: 'skipped',
        });
        skipped++;
        continue;
      }

      try {
        if (selection.action === 'create') {
          const area = await this.createArea(parsedArea, selection);
          results.push({
            name: parsedArea.name,
            action: 'created',
            location_id: area.id,
          });
          created++;
        } else if (selection.action === 'update' && parsedArea.existing_area_id) {
          const area = await this.updateArea(parsedArea.existing_area_id, parsedArea, selection);
          results.push({
            name: parsedArea.name,
            action: 'updated',
            location_id: area.id,
          });
          updated++;
        } else {
          results.push({
            name: parsedArea.name,
            action: 'failed',
            error: 'Cannot update: no existing area matched',
          });
          failed++;
        }
      } catch (error) {
        this.logger.error(`Failed to import area ${parsedArea.name}: ${error.message}`);
        results.push({
          name: parsedArea.name,
          action: 'failed',
          error: error.message,
        });
        failed++;
      }
    }

    // Delete session after confirm
    this.sessions.delete(dto.session_id);

    return {
      total_processed: dto.areas.length,
      created,
      updated,
      skipped,
      failed,
      results,
    };
  }

  /**
   * Extract KML content from KMZ file
   */
  private async extractKmlFromKmz(buffer: Buffer): Promise<string> {
    try {
      const zip = await JSZip.loadAsync(buffer);

      // Find the KML file in the archive (usually doc.kml or *.kml)
      const kmlFile = Object.keys(zip.files).find((name) => name.toLowerCase().endsWith('.kml'));

      if (!kmlFile) {
        throw new BadRequestException('No KML file found in the KMZ archive');
      }

      return await zip.file(kmlFile)!.async('string');
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to extract KML from KMZ file: ' + error.message);
    }
  }

  /**
   * Parse KML content to extract areas
   */
  private async parseKml(kmlContent: string): Promise<ParsedAreaDto[]> {
    const parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: true,
      tagNameProcessors: [xml2js.processors.stripPrefix],
    });

    try {
      const result = await parser.parseStringPromise(kmlContent);

      // Navigate to Document or directly to Folder
      const kml = result.kml;
      if (!kml) {
        throw new BadRequestException('Invalid KML: no kml root element');
      }

      const areas: ParsedAreaDto[] = [];
      const placemarks = this.extractPlacemarks(kml);

      for (const placemark of placemarks) {
        const area = this.parsePlacemark(placemark);
        if (area) {
          areas.push(area);
        }
      }

      return areas;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to parse KML: ' + error.message);
    }
  }

  /**
   * Extract all Placemark elements from KML structure
   */
  private extractPlacemarks(kml: any): any[] {
    const placemarks: any[] = [];

    const extractFromNode = (node: any) => {
      if (!node) return;

      // Direct Placemark
      if (node.Placemark) {
        const pm = Array.isArray(node.Placemark) ? node.Placemark : [node.Placemark];
        placemarks.push(...pm);
      }

      // Document container
      if (node.Document) {
        extractFromNode(node.Document);
      }

      // Folder container
      if (node.Folder) {
        const folders = Array.isArray(node.Folder) ? node.Folder : [node.Folder];
        folders.forEach(extractFromNode);
      }
    };

    extractFromNode(kml);
    return placemarks;
  }

  /**
   * Parse a single Placemark into ParsedAreaDto
   */
  private parsePlacemark(placemark: any): ParsedAreaDto | null {
    if (!placemark) return null;

    const name = placemark.name || 'Unnamed Location';
    const description = placemark.description || undefined;

    let center: { longitude: number; latitude: number } | null = null;
    let polygon: { longitude: number; latitude: number }[] | null = null;

    // Parse Point
    if (placemark.Point && placemark.Point.coordinates) {
      const coords = this.parseCoordinates(placemark.Point.coordinates);
      if (coords.length > 0) {
        center = { longitude: coords[0].longitude, latitude: coords[0].latitude };
      }
    }

    // Parse Polygon
    if (placemark.Polygon) {
      const outerBoundary = placemark.Polygon.outerBoundaryIs?.LinearRing?.coordinates;
      if (outerBoundary) {
        polygon = this.parseCoordinates(outerBoundary);
        if (polygon.length > 0 && !center) {
          // Calculate centroid as center
          center = this.calculateCentroid(polygon);
        }
      }
    }

    // Parse LineString as boundary approximation
    if (placemark.LineString && placemark.LineString.coordinates) {
      const coords = this.parseCoordinates(placemark.LineString.coordinates);
      if (coords.length > 0) {
        polygon = coords;
        if (!center) {
          center = this.calculateCentroid(coords);
        }
      }
    }

    // Skip if no valid geometry
    if (!center) {
      this.logger.warn(`Skipping placemark "${name}": no valid geometry`);
      return null;
    }

    // Calculate coverage area if polygon available
    let coverage_area: number | undefined;
    if (polygon && polygon.length >= 3) {
      coverage_area = this.calculatePolygonArea(polygon);
    }

    return {
      name,
      description,
      center,
      polygon: polygon || undefined,
      coverage_area,
      match_status: 'new',
    };
  }

  /**
   * Parse KML coordinate string
   */
  private parseCoordinates(
    coordString: string,
  ): { longitude: number; latitude: number; altitude?: number }[] {
    if (!coordString) return [];

    const coords: { longitude: number; latitude: number; altitude?: number }[] = [];

    // Split by whitespace and newlines
    const points = coordString.trim().split(/\s+/);

    for (const point of points) {
      const parts = point.split(',');
      if (parts.length >= 2) {
        const longitude = parseFloat(parts[0]);
        const latitude = parseFloat(parts[1]);
        const altitude = parts.length > 2 ? parseFloat(parts[2]) : undefined;

        if (!isNaN(longitude) && !isNaN(latitude)) {
          coords.push({ longitude, latitude, altitude });
        }
      }
    }

    return coords;
  }

  /**
   * Calculate centroid of polygon
   */
  private calculateCentroid(coords: { longitude: number; latitude: number }[]): {
    longitude: number;
    latitude: number;
  } {
    if (coords.length === 0) {
      return { longitude: 0, latitude: 0 };
    }

    const sum = coords.reduce(
      (acc, coord) => ({
        longitude: acc.longitude + coord.longitude,
        latitude: acc.latitude + coord.latitude,
      }),
      { longitude: 0, latitude: 0 },
    );

    return {
      longitude: sum.longitude / coords.length,
      latitude: sum.latitude / coords.length,
    };
  }

  /**
   * Calculate polygon area using Shoelace formula (approximate)
   * Returns area in square meters
   */
  private calculatePolygonArea(coords: { longitude: number; latitude: number }[]): number {
    if (coords.length < 3) return 0;

    // Approximate conversion: 1 degree ≈ 111,320 meters at equator
    // For latitude, this is fairly accurate
    // For longitude, we need to account for latitude
    const avgLat = coords.reduce((sum, c) => sum + c.latitude, 0) / coords.length;
    const latFactor = 111320;
    const lngFactor = 111320 * Math.cos((avgLat * Math.PI) / 180);

    // Convert to meters
    const meterCoords = coords.map((c) => ({
      x: c.longitude * lngFactor,
      y: c.latitude * latFactor,
    }));

    // Shoelace formula
    let area = 0;
    const n = meterCoords.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += meterCoords[i].x * meterCoords[j].y;
      area -= meterCoords[j].x * meterCoords[i].y;
    }

    return Math.abs(area / 2);
  }

  /**
   * Match parsed areas with existing areas in database
   */
  private async matchExistingAreas(areas: ParsedAreaDto[]): Promise<void> {
    const existingAreas = await this.areaRepository.find();

    for (const area of areas) {
      // Try to match by name (case-insensitive)
      const match = existingAreas.find((ea) => ea.name.toLowerCase() === area.name.toLowerCase());

      if (match) {
        area.existing_area_id = match.id;
        area.match_status = 'update';
      } else {
        area.match_status = 'new';
      }
    }
  }

  /**
   * Create new area from parsed data
   */
  private async createArea(parsedArea: ParsedAreaDto, selection: any): Promise<Location> {
    const area = new Location();
    area.name = selection.name_override || parsedArea.name;
    area.gps_lat = parsedArea.center.latitude;
    area.gps_lng = parsedArea.center.longitude;
    area.coverage_area = parsedArea.coverage_area;
    area.location_type_id = selection.location_type_id;
    area.district_id = selection.district_id;
    area.is_active = true;

    return this.areaRepository.save(area);
  }

  /**
   * Update existing area with parsed data
   */
  private async updateArea(
    areaId: string,
    parsedArea: ParsedAreaDto,
    selection: any,
  ): Promise<Location> {
    const area = await this.areaRepository.findOne({ where: { id: areaId } });

    if (!area) {
      throw new NotFoundException(`Location with ID ${areaId} not found`);
    }

    // Update fields
    area.gps_lat = parsedArea.center.latitude;
    area.gps_lng = parsedArea.center.longitude;

    if (parsedArea.coverage_area) {
      area.coverage_area = parsedArea.coverage_area;
    }

    if (selection.name_override) {
      area.name = selection.name_override;
    }

    if (selection.location_type_id) {
      area.location_type_id = selection.location_type_id;
    }

    if (selection.district_id) {
      area.district_id = selection.district_id;
    }

    return this.areaRepository.save(area);
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
      }
    }
  }
}
