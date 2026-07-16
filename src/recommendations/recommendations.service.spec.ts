import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsService } from './recommendations.service';
import { Neo4jService } from '../neo4j/neo4j.service';

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  const createMockRecord = (data: Record<string, any>) => {
    return {
      get: jest.fn((key: string): any => data[key]),
    };
  };

  const mockSession = {
    run: jest.fn(),
  };

  const mockNeo4jService = {
    getSession: jest.fn(() => mockSession),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: Neo4jService,
          useValue: mockNeo4jService,
        },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSuggestedFollows', () => {
    it('should return suggested users weighted by mutual connections', async () => {
      const mockResult = {
        records: [
          createMockRecord({
            id: 'user-2',
            username: 'alice',
            full_handle: 'alice@example.com',
            mutual_friends: { toNumber: () => 3 },
          }),
          createMockRecord({
            id: 'user-3',
            username: 'bob',
            full_handle: 'bob@example.com',
            mutual_friends: { toNumber: () => 2 },
          }),
        ],
      };

      mockSession.run.mockResolvedValue(mockResult);

      const result = await service.getSuggestedFollows('user-1', 10);

      expect(result).toHaveLength(2);
      expect(result[0].username).toBe('alice');
      expect(result[0].mutual_friends).toBe(3);
      expect(result[1].username).toBe('bob');
      expect(result[1].mutual_friends).toBe(2);
      expect(mockSession.run).toHaveBeenCalled();
    });

    it('should not suggest users already followed', async () => {
      const mockResult = { records: [] };
      mockSession.run.mockResolvedValue(mockResult);

      const result = await service.getSuggestedFollows('user-1', 10);

      expect(result).toHaveLength(0);
    });

    it('should respect the limit parameter', async () => {
      const mockResult = { records: [] };
      mockSession.run.mockResolvedValue(mockResult);

      await service.getSuggestedFollows('user-1', 5);

      const callArgs = mockSession.run.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(callArgs[1]).toEqual({ userId: 'user-1', limit: 5 });
    });

    it('should handle errors gracefully', async () => {
      mockSession.run.mockRejectedValue(new Error('DB Error'));

      await expect(service.getSuggestedFollows('user-1')).rejects.toThrow();
    });
  });

  describe('getSuggestedPosts', () => {
    it('should return suggested posts with engagement scores', async () => {
      const mockResult = {
        records: [
          createMockRecord({
            id: 'post-1',
            content: 'Great post about graphs!',
            author_id: 'user-2',
            author_username: 'alice',
            created_at: '2026-05-30T12:00:00Z',
            likes_count: { toNumber: () => 5 },
            engagement_score: 7.5,
          }),
        ],
      };

      mockSession.run.mockResolvedValue(mockResult);

      const result = await service.getSuggestedPosts('user-1', 20);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Great post about graphs!');
      expect(result[0].likes_count).toBe(5);
      expect(result[0].engagement_score).toBe(7.5);
    });

    it('should filter posts already liked by user', async () => {
      const mockResult = { records: [] };
      mockSession.run.mockResolvedValue(mockResult);

      const result = await service.getSuggestedPosts('user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getSimilarUsers', () => {
    it('should return users with similar follow patterns', async () => {
      const mockResult = {
        records: [
          createMockRecord({
            id: 'user-4',
            username: 'charlie',
            full_handle: 'charlie@example.com',
            similarity_score: { toNumber: () => 5 },
          }),
        ],
      };

      mockSession.run.mockResolvedValue(mockResult);

      const result = await service.getSimilarUsers('user-1', 10);

      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('charlie');
      expect(result[0].similarity_score).toBe(5);
    });

    it('should not return the user themselves', async () => {
      const mockResult = { records: [] };
      mockSession.run.mockResolvedValue(mockResult);

      const result = await service.getSimilarUsers('user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getPersonalizedFeed', () => {
    it('should return posts ordered by engagement score', async () => {
      const mockResult = {
        records: [
          createMockRecord({
            id: 'post-1',
            content: 'Trending post',
            author_username: 'alice',
            created_at: '2026-05-30T12:00:00Z',
            likes_count: { toNumber: () => 10 },
            engagement_score: 15.0,
          }),
          createMockRecord({
            id: 'post-2',
            content: 'Good post',
            author_username: 'bob',
            created_at: '2026-05-30T10:00:00Z',
            likes_count: { toNumber: () => 3 },
            engagement_score: 5.0,
          }),
        ],
      };

      mockSession.run.mockResolvedValue(mockResult);

      const result = await service.getPersonalizedFeed('user-1', 20);

      expect(result).toHaveLength(2);
      expect(result[0].engagement_score).toBe(15.0);
      expect(result[1].engagement_score).toBe(5.0);
    });
  });

  describe('getCompleteRecommendations', () => {
    it('should return all recommendation types with metrics', async () => {
      // Mock the parallel calls
      jest.spyOn(service, 'getSuggestedFollows').mockResolvedValue([
        {
          id: 'user-2',
          username: 'alice',
          full_handle: 'alice@example.com',
          mutual_friends: 3,
        },
      ]);

      jest.spyOn(service, 'getSuggestedPosts').mockResolvedValue([
        {
          id: 'post-1',
          content: 'Great post',
          author_id: 'user-2',
          author_username: 'alice',
          created_at: '2026-05-30T12:00:00Z',
          likes_count: 5,
          engagement_score: 7.5,
        },
      ]);

      jest.spyOn(service, 'getSimilarUsers').mockResolvedValue([
        {
          id: 'user-4',
          username: 'charlie',
          full_handle: 'charlie@example.com',
          similarity_score: 5,
        },
      ]);

      jest.spyOn(service, 'getDatasetSize').mockResolvedValue({
        totalUsers: 100,
        totalPosts: 500,
        totalFollows: 250,
      });

      const result = await service.getCompleteRecommendations('user-1');

      expect(result.userId).toBe('user-1');
      expect(result.recommendedUsers).toHaveLength(2);
      expect(result.recommendedPosts).toHaveLength(1);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.datasetSize.totalUsers).toBe(100);
    });
  });

  describe('getDatasetSize', () => {
    it('should return dataset statistics', async () => {
      const mockResult = {
        records: [
          createMockRecord({
            total_users: { toNumber: () => 100 },
            total_posts: { toNumber: () => 500 },
            total_follows: { toNumber: () => 250 },
          }),
        ],
      };

      mockSession.run.mockResolvedValue(mockResult);

      const result = await service.getDatasetSize();

      expect(result.totalUsers).toBe(100);
      expect(result.totalPosts).toBe(500);
      expect(result.totalFollows).toBe(250);
    });

    it('should handle errors and return zeros', async () => {
      mockSession.run.mockRejectedValue(new Error('DB Error'));

      const result = await service.getDatasetSize();

      expect(result).toEqual({
        totalUsers: 0,
        totalPosts: 0,
        totalFollows: 0,
      });
    });
  });
});
