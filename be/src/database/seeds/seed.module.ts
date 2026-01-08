import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { User } from '../../modules/users/entities/user.entity';
import { AuthModule } from '../../modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
