import type {
  MessagePollBody as MessagePollBodyContract,
  MessagePollOptionBody as MessagePollOptionBodyContract,
} from '@epicstory/contracts';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class MessagePollOptionBody implements MessagePollOptionBodyContract {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label: string;
}

export class MessagePollBody implements MessagePollBodyContract {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MessagePollOptionBody)
  options: MessagePollOptionBody[];
}
