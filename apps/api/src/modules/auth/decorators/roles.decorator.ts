import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@cityrider/types';
import { ROLES_KEY } from '../guards/roles.guard';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
