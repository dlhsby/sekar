import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../modules/users/entities/user.entity';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private authService: AuthService,
  ) {}

  async seedDatabase() {
    console.log('🌱 Seeding database...');

    await this.clearDatabase();
    await this.seedUsers();

    console.log('✅ Database seeded successfully!');
  }

  private async clearDatabase() {
    console.log('🗑️  Clearing existing data...');
    // Use clear() instead of delete({}) to delete all records
    await this.userRepository.clear();
  }

  private async seedUsers() {
    console.log('👥 Seeding users...');

    const users = [
      {
        username: 'admin',
        password: 'admin123',
        full_name: 'System Administrator',
        role: UserRole.ADMIN,
      },
      {
        username: 'supervisor1',
        password: 'supervisor123',
        full_name: 'Supervisor Satu',
        role: UserRole.SUPERVISOR,
      },
      {
        username: 'supervisor2',
        password: 'supervisor123',
        full_name: 'Supervisor Dua',
        role: UserRole.SUPERVISOR,
      },
      {
        username: 'worker1',
        password: 'worker123',
        full_name: 'Pekerja Satu',
        role: UserRole.WORKER,
      },
      {
        username: 'worker2',
        password: 'worker123',
        full_name: 'Pekerja Dua',
        role: UserRole.WORKER,
      },
      {
        username: 'worker3',
        password: 'worker123',
        full_name: 'Pekerja Tiga',
        role: UserRole.WORKER,
      },
    ];

    for (const userData of users) {
      const password_hash = await this.authService.hashPassword(userData.password);
      const user = this.userRepository.create({
        username: userData.username,
        password_hash,
        full_name: userData.full_name,
        role: userData.role,
      });
      await this.userRepository.save(user);
      console.log(`  ✓ Created ${userData.role}: ${userData.username}`);
    }
  }
}
