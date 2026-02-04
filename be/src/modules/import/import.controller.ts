import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { ImportService } from './import.service';
import {
  KmzUploadResponseDto,
  KmzConfirmRequestDto,
  KmzConfirmResponseDto,
} from './dto/kmz-import.dto';

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
  constructor(private readonly importService: ImportService) {}

  /**
   * Upload and parse KMZ/KML file
   */
  @Post('kmz/upload')
  @Roles(UserRole.ADMIN)
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
  @Roles(UserRole.ADMIN)
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
  @Roles(UserRole.ADMIN)
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
