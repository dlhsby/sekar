import { UserRole } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
