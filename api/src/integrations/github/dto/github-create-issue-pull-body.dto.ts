import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class GithubCreateIssuePullBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  owner!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(244)
  headBranch!: string;

  /** Defaults to repo default_branch from the project link row (required when unset there). */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  baseBranch?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(65535)
  bodyMarkdown?: string;

  @IsOptional()
  @IsBoolean()
  draft?: boolean;
}
