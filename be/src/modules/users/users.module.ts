import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UserValidationService } from './services/user-validation.service';
import { SoftDeletePurgeCron } from './cron/soft-delete-purge.cron';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => AuthModule),
    SharedModule,
    MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } }),
  ],
  controllers: [UsersController],
  providers: [UsersService, UserValidationService, SoftDeletePurgeCron],
  exports: [UsersService],
})
export class UsersModule {}
