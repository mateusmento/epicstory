import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { patch } from 'src/core/objects';

export class Signin {
  user: any;

  constructor(data: Partial<Signin>) {
    patch(this, data);
  }
}

@CommandHandler(Signin)
export class SigninCommand implements ICommandHandler<Signin> {
  constructor(private jwtService: JwtService) {}

  async execute(command: Signin) {
    return {
      token: await this.jwtService.signAsync({ ...command.user }),
      user: command.user,
    };
  }
}
