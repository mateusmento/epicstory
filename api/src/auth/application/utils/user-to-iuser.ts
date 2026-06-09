import type { User } from 'src/auth/domain/entities/user.entity';
import type { IUser } from '@epicstory/contracts';

export function userToIUser(u: User): IUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    picture: u.picture,
  };
}
