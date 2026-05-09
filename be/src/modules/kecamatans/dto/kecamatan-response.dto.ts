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
  rayon_id: string;

  @ApiProperty({ required: false })
  rayon_name?: string;

  @ApiProperty({ enum: ['pusat', 'timur', 'barat', 'utara', 'selatan'] })
  region: KecamatanRegion;

  static fromEntity(k: Kecamatan): KecamatanResponseDto {
    return {
      id: k.id,
      name: k.name,
      code: k.code,
      rayon_id: k.rayon_id,
      rayon_name: k.rayon?.name,
      region: k.region,
    };
  }
}
