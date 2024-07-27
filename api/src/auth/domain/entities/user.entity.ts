import { compare } from 'bcryptjs';
import { create } from 'src/core/objects';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'auth' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  static create(data: { name: string; email: string; password: string }) {
    return create(User, data);
  }

  comparePassword(password: string) {
    return compare(password, this.password);
  }
}
