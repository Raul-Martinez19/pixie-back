import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  Logger,
  Query,
  Body,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }
  @Get()
  findAllOthers(@Param('id') id: number) {
    return this.userService.findAllOthers(id);
  }

  @Get('profile/:username')
  findByUsername(@Param('username') username: string) {
    return this.userService.findByUsername(username);
  }

  @Get('foll/:username')
  getFoll(@Param('username') username: string) {
    return this.userService.getFoll(username);
  }

  @Get('search')
  async searchUsers(
    @Query('q') query: string,
    @Query('federated') federated?: string,
    @Query('excludeHandle') excludeHandle?: string,
  ) {
    const includeFederated = federated === 'true';
    this.logger.log(
      `Buscando usuarios: "${query}" (Federated: ${includeFederated})`,
    );
    return await this.userService.searchUsers(
      query,
      includeFederated,
      excludeHandle,
    );
  }

  @Get('remote-profile')
  async getRemoteProfile(@Query('handle') handle: string) {
    this.logger.log(`Obteniendo perfil remoto: ${handle}`);
    return await this.userService.getRemoteProfile(handle);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
