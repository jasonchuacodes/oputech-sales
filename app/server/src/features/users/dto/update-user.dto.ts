import { UserRole } from '../schemas/user.schema';

export class UpdateUserDto {
  username?: string;
  fullName?: string;
  email?: string;
  role?: UserRole;
}
