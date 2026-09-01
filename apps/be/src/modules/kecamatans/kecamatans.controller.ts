import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KecamatansService } from './kecamatans.service';
import { KecamatanResponseDto } from './dto/kecamatan-response.dto';

@ApiTags('kecamatans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kecamatans')
export class KecamatansController {
  constructor(private readonly service: KecamatansService) {}

  @Get()
  @ApiOperation({ summary: 'List kecamatans (optionally filtered by district)' })
  @ApiQuery({ name: 'districtId', required: false, type: String })
  async findAll(@Query('districtId') districtId?: string): Promise<KecamatanResponseDto[]> {
    const items = await this.service.findAll(districtId);
    return items.map(KecamatanResponseDto.fromEntity);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single kecamatan' })
  async findOne(@Param('id') id: string): Promise<KecamatanResponseDto> {
    return KecamatanResponseDto.fromEntity(await this.service.findOne(id));
  }
}
