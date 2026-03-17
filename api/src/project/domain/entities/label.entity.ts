import { patch } from 'src/core/objects';
import { PROJECT_SCHEMA } from 'src/project/constants';
import { Workspace } from 'src/workspace/domain/entities';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: PROJECT_SCHEMA })
export class Label {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  workspaceId: number;
  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @Column()
  name: string;

  // Hex color (e.g. #3B82F6) persisted as text to avoid enum churn.
  @Column()
  color: string;

  @CreateDateColumn()
  createdAt: Date;

  constructor(data: Partial<Label> = {}) {
    patch(this, data);
  }

  static create(data: Partial<Label> = {}) {
    return new Label(data);
  }
}
