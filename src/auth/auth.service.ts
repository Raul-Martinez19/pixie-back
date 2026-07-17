import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { User } from '../user/entities/user.entity';

interface UserPayload {
  id: string;
  username: string;
  full_handle: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) { }

  async register(
    createUserDto: CreateUserDto,
  ): Promise<{ access_token: string; user: Partial<User> }> {
    console.log('Datos de registro recibidos:', createUserDto);
    console.log('Registrando nuevo usuario: ', createUserDto.username);
    this.logger.log(` Registrando nuevo usuario: ${createUserDto.username}`);

    const user = await this.userService.createUser(createUserDto);

    // Generar token después del registro
    const token = this.login({
      id: user.id,
      username: user.username,
      full_handle: user.full_handle,
    });

    // No devolver la contraseña
    const { password: _password, ...userWithoutPassword } = user;
    void _password;

    return {
      access_token: token.access_token,
      user: userWithoutPassword,
    };
  }

  async validateAndLogin(
    username: string,
    password: string,
  ): Promise<{ access_token: string; user: Partial<User> }> {
    this.logger.log(` Validando usuario: ${username}`);

    const user = await this.userService.validateUser(username, password);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const token = this.login({
      id: user.id,
      username: user.username,
      full_handle: user.full_handle,
    });

    return {
      access_token: token.access_token,
      user,
    };
  }

  login(user: UserPayload) {
    this.logger.log(` Firmando token para usuario: ${user.username}`);
    const payload = {
      username: user.username,
      sub: user.id,
      full_handle: user.full_handle,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
