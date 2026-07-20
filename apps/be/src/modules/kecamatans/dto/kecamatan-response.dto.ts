import { ApiProperty } from '@nestjs/swagger';
import { Kecamatan, KecamatanRegion } from '../entities/kecamatan.entity';

export class KecamatanResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  district_id: string;

  @ApiProperty({ required: false })
  district_name?: string;

  @ApiProperty({ enum: ['pusat', 'timur', 'barat', 'utara', 'selatan'] })
  region: KecamatanRegion;

  static fromEntity(k: Kecamatan): KecamatanResponseDto {
    return {
      id: k.id,
      name: k.name,
      code: k.code,
      district_id: k.district_id,
      district_name: k.district?.name,
      region: k.region,
    };
  }
}
