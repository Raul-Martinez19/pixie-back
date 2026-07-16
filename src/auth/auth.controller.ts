import {
  Controller,
  Post,
  Body,
  BadRequestException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginUserDto } from '../user/dto/login-user.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    try {
      this.logger.log(` Registering user: ${createUserDto.username}`);

      if (
        !createUserDto.username ||
        !createUserDto.email ||
        !createUserDto.password
      ) {
        throw new BadRequestException(
          'Username, email, and password are required',
        );
      }

      const result = await this.authService.register(createUserDto);

      this.logger.log(
        `Usuario registrado exitosamente: ${createUserDto.username}`,
      );

      return {
        statusCode: 201,
        message: 'Usuario registrado exitosamente',
        data: result,
      };
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(` Error registrando usuario: ${errorMessage}`);
      throw new BadRequestException(errorMessage);
    }
  }

  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto) {
    try {
      this.logger.log(` Login attempt for user: ${loginUserDto.username}`);

      if (!loginUserDto.username || !loginUserDto.password) {
        throw new BadRequestException('Username and password are required');
      }

      const result = await this.authService.validateAndLogin(
        loginUserDto.username,
        loginUserDto.password,
      );

      this.logger.log(`Login exitoso para: ${loginUserDto.username}`);

      return {
        statusCode: 200,
        message: 'Login exitoso',
        data: result,
      };
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(` Error en login: ${errorMessage}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(errorMessage);
    }
  }
}
