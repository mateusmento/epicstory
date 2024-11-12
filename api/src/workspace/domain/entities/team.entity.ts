import { create } from 'src/core/objects';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'workspace' })
export class Team {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  workspaceId: number;

  static create(data: { name: string; workspaceId: number }) {
    return create(Team, data);
  }
}
