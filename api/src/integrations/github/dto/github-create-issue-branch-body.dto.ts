import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class GithubCreateIssueBranchBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  owner!: string;

  /** Repository leaf name (`my-repo`). */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  baseBranch?: string;

  /** If omitted: `{issueId}-{slug-from-title}` (task 01 §7.1 branch default seed). */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(244)
  branchName?: string;
}
