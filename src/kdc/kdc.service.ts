import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { ConflictException, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { RegisterDto } from './dto/register.dto';
import * as bigIntCryptoUtils from 'bigint-crypto-utils';
import * as crypto from 'crypto';

@Injectable()
export class KdcService {
  private keySize = 2048;

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async getUsers() {
    let cursor = '0'; // starting cursor
    const pattern = `users:*`; // pattern to match
    const keys = [];

    async function scan(redis: Redis) {
      const [nextCursor, redisKeys] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
      );
      console.log(redisKeys);
      keys.push(...redisKeys);

      // continue scanning until cursor is 0
      if (nextCursor !== '0') {
        cursor = nextCursor;
        await scan(redis);
      }
    }

    // call scan function to retrieve all keys that start with "refreshTokensBlacklist"
    await scan(this.redis);

    return await Promise.all(
      keys.map(async (value) => await this.redis.hgetall(value)),
    );
  }

  async register(registerDto: RegisterDto) {
    const { username } = registerDto;

    if (await this.checkUserExists(username)) {
      throw new ConflictException(
        `User with username: ${username} already exists`,
      );
    }

    await this.redis.hset(`users:${username}`, { username });

    return { message: 'Successfully registered' };
  }

  async addSocketId(username, socketId) {
    await this.redis.hset(`users:${username}`, { socketId, isConnected: true });
  }

  async generateKeyPair(username) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: this.keySize,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    await this.redis.hset(`users:${username}`, { publicKey });

    return { privateKey, publicKey };
  }

  async getUser(username) {
    return await this.redis.hgetall(`users:${username}`);
  }

  async isUserConnected(username): Promise<boolean> {
    const user = await this.getUser(username);

    return user.isConnected === 'true';
  }

  async checkUserExists(username: string | string[]): Promise<boolean> {
    return (await this.redis.exists(`users:${username}`)) === 1;
  }

  async disconnectSocketId(username) {
    await this.redis.hset(`users:${username}`, { isConnected: false });
  }
}
