import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserService: { createUser: jest.Mock; validateUser: jest.Mock };
  let mockJwtService: { sign: jest.Mock };

  beforeEach(async () => {
    mockUserService = { createUser: jest.fn(), validateUser: jest.fn() };
    mockJwtService = { sign: jest.fn().mockReturnValue('jwt-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Prueba estructural: verifica la inyección de dependencias del módulo.
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register()', () => {
    it('should create a user and return an access token without the password', async () => {
      const dto = { username: 'alice', password: 'secret', email: 'alice@example.com' };
      mockUserService.createUser.mockResolvedValue({
        id: 'user-1',
        username: 'alice',
        full_handle: 'alice@local',
        password: 'hashed-secret',
      });

      const result = await service.register(dto as any);

      expect(mockUserService.createUser).toHaveBeenCalledWith(dto);
      expect(result.access_token).toBe('jwt-token');
      expect(result.user).not.toHaveProperty('password');
      expect(result.user.username).toBe('alice');
    });
  });

  describe('validateAndLogin()', () => {
    it('should return a token when credentials are valid', async () => {
      const user = { id: 'user-1', username: 'alice', full_handle: 'alice@local' };
      mockUserService.validateUser.mockResolvedValue(user);

      const result = await service.validateAndLogin('alice', 'secret');

      expect(mockUserService.validateUser).toHaveBeenCalledWith('alice', 'secret');
      expect(result.access_token).toBe('jwt-token');
      expect(result.user).toEqual(user);
    });

    it('should throw when credentials are invalid', async () => {
      mockUserService.validateUser.mockResolvedValue(null);

      await expect(service.validateAndLogin('alice', 'wrong')).rejects.toThrow(
        'Credenciales inválidas',
      );
    });
  });
});
