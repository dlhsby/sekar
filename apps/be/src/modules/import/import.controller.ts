import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { USER_MANAGERS } from '../users/constants/role-groups';
import { UserThrottlerGuard } from '../../common/guards/user-throttler.guard';
import { ImportService } from './import.service';
import { CsvImportService } from './csv/csv-import.service';
import { isCsvImportEntity } from './csv/csv-templates';
import { CsvValidationResponseDto, CsvCommitResponseDto } from './dto/csv-import.dto';
import {
  KmzUploadResponseDto,
  KmzConfirmRequestDto,
  KmzConfirmResponseDto,
} from './dto/kmz-import.dto';

/** Multer config shared by CSV upload endpoints (1MB, .csv only). */
const CSV_UPLOAD = {
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    if (file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Only CSV files are allowed'), false);
    }
  },
};

/**
 * Controller for KMZ/KML import operations
 *
 * Provides endpoints for:
 * - Uploading and parsing KMZ/KML files
 * - Previewing parsed areas
 * - Confirming import to create/update areas
 */
@ApiTags('Import')
@ApiBearerAuth()
@Controller('import')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly csvImportService: CsvImportService,
  ) {}

  /**
   * Download an empty CSV template (header row only) for an importable entity.
   */
  @Get('template/:entity')
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'Download a CSV import template' })
  @ApiResponse({ status: 200, description: 'CSV template file' })
  getTemplate(@Param('entity') entity: string, @Res() res: Response): void {
    if (!isCsvImportEntity(entity)) {
      throw new BadRequestException('Template is only available for: users, areas');
    }
    const { filename, content } = this.csvImportService.getTemplate(entity);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(content);
  }

  /** Validate a users CSV and stash valid rows for confirmation. */
  @Post('users/csv')
  @Roles(...USER_MANAGERS)
  @UseInterceptors(FileInterceptor('file', CSV_UPLOAD))
  @ApiOperation({ summary: 'Validate a users CSV (preview before commit)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({ status: 201, type: CsvValidationResponseDto })
  async validateUsersCsv(
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: User,
  ): Promise<CsvValidationResponseDto> {
    return this.csvImportService.validate('users', file, user.id);
  }

  /** Validate an areas CSV and stash valid rows for confirmation. */
  @Post('areas/csv')
  @Roles(...USER_MANAGERS)
  @UseInterceptors(FileInterceptor('file', CSV_UPLOAD))
  @ApiOperation({ summary: 'Validate an areas CSV (preview before commit)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({ status: 201, type: CsvValidationResponseDto })
  async validateAreasCsv(
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: User,
  ): Promise<CsvValidationResponseDto> {
    return this.csvImportService.validate('areas', file, user.id);
  }

  /** Commit a previously-validated CSV import session. */
  @Post('confirm/:sessionId')
  @Roles(...USER_MANAGERS)
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Commit a validated CSV import session' })
  @ApiResponse({ status: 201, type: CsvCommitResponseDto })
  @ApiResponse({ status: 403, description: 'Not the session owner' })
  @ApiResponse({ status: 404, description: 'Session not found or expired' })
  async confirmCsv(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @GetUser() user: User,
  ): Promise<CsvCommitResponseDto> {
    return this.csvImportService.confirm(sessionId, user.id);
  }

  /**
   * Upload and parse KMZ/KML file
   */
  @Post('kmz/upload')
  @Roles(...USER_MANAGERS)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: (req, file, cb) => {
        const validExtensions = ['.kmz', '.kml'];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const ext = file.originalname.toLowerCase().slice(-4);
        if (validExtensions.some((v) => file.originalname.toLowerCase().endsWith(v))) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only KMZ and KML files are allowed'), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Upload and parse KMZ/KML file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'KMZ or KML file to import',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File parsed successfully',
    type: KmzUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file or parse error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async uploadKmz(
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: User,
  ): Promise<KmzUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.importService.uploadKmz(file, user.id);
  }

  /**
   * Get preview of parsed areas from upload session
   */
  @Get('kmz/preview/:sessionId')
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'Get preview of parsed areas' })
  @ApiResponse({
    status: 200,
    description: 'Preview retrieved successfully',
    type: KmzUploadResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session not found or expired' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getPreview(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @GetUser() user: User,
  ): Promise<KmzUploadResponseDto> {
    return this.importService.getPreview(sessionId, user.id);
  }

  /**
   * Confirm import and create/update areas
   */
  @Post('kmz/confirm')
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'Confirm and execute import' })
  @ApiResponse({
    status: 201,
    description: 'Import completed',
    type: KmzConfirmResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Session not found or expired' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async confirmImport(
    @Body() dto: KmzConfirmRequestDto,
    @GetUser() user: User,
  ): Promise<KmzConfirmResponseDto> {
    return this.importService.confirmImport(dto, user.id);
  }
}
