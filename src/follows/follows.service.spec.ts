import { Test, TestingModule } from '@nestjs/testing';
import { FollowsService } from './follows.service';
import { UserService } from '../user/user.service';
import { Neo4jService } from '../neo4j/neo4j.service';

describe('FollowsService', () => {
  let service: FollowsService;
  let mockUserService: {
    findByFullHandle: jest.Mock;
    createRemoteUser: jest.Mock;
    findByUsername: jest.Mock;
  };
  let mockNeo4jService: { runQuery: jest.Mock };

  beforeEach(async () => {
    mockUserService = {
      findByFullHandle: jest.fn(),
      createRemoteUser: jest.fn(),
      findByUsername: jest.fn(),
    };
    mockNeo4jService = { runQuery: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowsService,
        { provide: UserService, useValue: mockUserService },
        { provide: Neo4jService, useValue: mockNeo4jService },
      ],
    }).compile();

    service = module.get<FollowsService>(FollowsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Prueba estructural: verifica la inyección de dependencias del módulo.
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('followUser()', () => {

    it('should throw if the target user does not exist locally and has no "@" in the handle', async () => {
      mockUserService.findByFullHandle.mockResolvedValue(null);

      await expect(service.followUser('alice@local', 'nonexistent')).rejects.toThrow(
        'User not found: nonexistent',
      );
    });
  });

  describe('unfollowUser()', () => {

    it('should throw if no follow relationship exists', async () => {
      mockNeo4jService.runQuery.mockResolvedValue([]);

      await expect(
        service.unfollowUser('alice', 'bob'),
      ).rejects.toThrow('No follow relationship found between alice and bob');
    });
  });
});
