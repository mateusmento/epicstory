import { IsString, MaxLength, MinLength } from 'class-validator';

export class LinkGithubRepoBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  owner: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;
}
