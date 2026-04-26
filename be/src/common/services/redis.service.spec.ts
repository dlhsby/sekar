import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

// ---------------------------------------------------------------------------
// ioredis mock
// We mock the whole 'ioredis' module before importing RedisService so that
// no real TCP connections are made.  The factory must handle both:
//   import Redis from 'ioredis'   (ES module default)
//   const Redis = require('ioredis')  (CJS)
// ---------------------------------------------------------------------------
const xreadgroupMock = jest.fn();

const makeClient = () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue('OK'),
  ping: jest.fn().mockResolvedValue('PONG'),
  xadd: jest.fn(),
  xgroup: jest.fn(),
  xack: jest.fn(),
  xreadgroup: xreadgroupMock,
  // RedisService calls this.client.xreadgroup.bind(this.client) to work around
  // the ioredis overload type restrictions.
  bind: jest.fn().mockReturnValue(xreadgroupMock),
});

// Track the two instances created by RedisService (client + subscriber)
let clientInstance: ReturnType<typeof makeClient>;
let subscriberInstance: ReturnType<typeof makeClient>;
let callCount = 0;

jest.mock('ioredis', () => {
  const ctor = jest.fn().mockImplementation(() => {
    callCount++;
    if (callCount % 2 === 1) {
      clientInstance = makeClient();
      return clientInstance;
    }
    subscriberInstance = makeClient();
    return subscriberInstance;
  });
  // Support both `new Redis()` and `import Redis from 'ioredis'`
  (ctor as any).default = ctor;
  return ctor;
});

// Import AFTER the mock is set up
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    callCount = 0;
    xreadgroupMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: string) =>
              key === 'REDIS_URL' ? 'redis://localhost:6379' : def,
            ),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('getClient / getSubscriber', () => {
    it('should return the two ioredis instances', () => {
      expect(service.getClient()).toBeDefined();
      expect(service.getSubscriber()).toBeDefined();
    });
  });

  describe('ping', () => {
    it('should return true when Redis responds PONG', async () => {
      clientInstance.ping.mockResolvedValueOnce('PONG');
      expect(await service.ping()).toBe(true);
    });

    it('should return false when Redis throws', async () => {
      clientInstance.ping.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      expect(await service.ping()).toBe(false);
    });
  });

  describe('streamAdd', () => {
    it('should call xadd with MAXLEN trimming and return message ID', async () => {
      const fakeId = '1700000000000-0';
      clientInstance.xadd.mockResolvedValueOnce(fakeId);

      const id = await service.streamAdd('location:pings', { userId: 'u1', lat: '-7.25' });

      expect(clientInstance.xadd).toHaveBeenCalledWith(
        'location:pings',
        'MAXLEN',
        '~',
        100_000,
        '*',
        'userId',
        'u1',
        'lat',
        '-7.25',
      );
      expect(id).toBe(fakeId);
    });

    it('should respect custom maxLen', async () => {
      clientInstance.xadd.mockResolvedValueOnce('1-0');
      await service.streamAdd('mystream', { k: 'v' }, 5000);

      expect(clientInstance.xadd).toHaveBeenCalledWith(
        'mystream',
        'MAXLEN',
        '~',
        5000,
        '*',
        'k',
        'v',
      );
    });
  });

  describe('streamCreateGroup', () => {
    it('should create group successfully', async () => {
      clientInstance.xgroup.mockResolvedValueOnce('OK');
      await expect(service.streamCreateGroup('mystream', 'mygroup')).resolves.toBeUndefined();
      expect(clientInstance.xgroup).toHaveBeenCalledWith(
        'CREATE',
        'mystream',
        'mygroup',
        '$',
        'MKSTREAM',
      );
    });

    it('should silently ignore BUSYGROUP error', async () => {
      clientInstance.xgroup.mockRejectedValueOnce(
        new Error('BUSYGROUP Consumer Group already exists'),
      );
      await expect(service.streamCreateGroup('mystream', 'mygroup')).resolves.toBeUndefined();
    });

    it('should re-throw non-BUSYGROUP errors', async () => {
      clientInstance.xgroup.mockRejectedValueOnce(new Error('WRONGTYPE'));
      await expect(service.streamCreateGroup('mystream', 'mygroup')).rejects.toThrow('WRONGTYPE');
    });
  });

  describe('streamReadGroup', () => {
    it('should return empty array when xreadgroup returns null', async () => {
      xreadgroupMock.mockResolvedValueOnce(null);
      const result = await service.streamReadGroup('s', 'g', 'c');
      expect(result).toEqual([]);
    });

    it('should parse raw stream messages into StreamMessage objects', async () => {
      xreadgroupMock.mockResolvedValueOnce([
        [
          'location:pings',
          [
            ['1-0', ['userId', 'u1', 'lat', '-7.25', 'lng', '112.75']],
            ['2-0', ['userId', 'u2', 'lat', '-7.30', 'lng', '112.80']],
          ],
        ],
      ]);

      const messages = await service.streamReadGroup('location:pings', 'g', 'c');

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({
        id: '1-0',
        fields: { userId: 'u1', lat: '-7.25', lng: '112.75' },
      });
      expect(messages[1].fields.userId).toBe('u2');
    });
  });

  describe('streamAck', () => {
    it('should call xack with the stream, group and message IDs', async () => {
      clientInstance.xack.mockResolvedValueOnce(2);
      await service.streamAck('mystream', 'mygroup', '1-0', '2-0');
      expect(clientInstance.xack).toHaveBeenCalledWith('mystream', 'mygroup', '1-0', '2-0');
    });

    it('should not call xack when no IDs are provided', async () => {
      await service.streamAck('mystream', 'mygroup');
      expect(clientInstance.xack).not.toHaveBeenCalled();
    });
  });
});
