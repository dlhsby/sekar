import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kecamatan } from './entities/kecamatan.entity';
import { KecamatansService } from './kecamatans.service';
import { KecamatansController } from './kecamatans.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Kecamatan])],
  controllers: [KecamatansController],
  providers: [KecamatansService],
  exports: [KecamatansService, TypeOrmModule],
})
export class KecamatansModule {}
