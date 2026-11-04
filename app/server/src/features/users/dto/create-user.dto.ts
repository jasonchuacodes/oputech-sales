import { UserRole } from '../schemas/user.schema';

export class CreateUserDto {
  username: string;
  fullName?: string;
  email?: string;
  password: string;
  role?: UserRole;
}
