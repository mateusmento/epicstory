import { compare } from 'bcryptjs';
import { Exclude } from 'class-transformer';
import { create } from 'src/core/objects';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'auth', name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column({ nullable: true })
  picture?: string;

  static create(data: { name: string; email: string; password: string }) {
    return create(User, data);
  }

  static fromOAuth(data: { name: string; email: string; picture?: string }) {
    return create(User, data);
  }

  comparePassword(password: string) {
    return compare(password, this.password);
  }
}
