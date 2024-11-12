import { compare } from 'bcryptjs';
import { create } from 'src/core/objects';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'auth' })
export class Identity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column()
  userId: number;

  static create(data: { email: string; password: string; userId: number }) {
    return create(Identity, data);
  }

  comparePassword(password: string) {
    return compare(password, this.password);
  }
}
