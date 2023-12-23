import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { ConflictException, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { RegisterDto } from './dto/register.dto';
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

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
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

  async generateKeyPair(
    username: string,
  ): Promise<{ privateKey: string; publicKey: string }> {
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

  async getEncryptedSessionKey(publicKey: string) {
    const sessionKey = this.generateRandomSessionKey();
    console.log(sessionKey);
    const encryptedSessionKey = this.encryptWithPublicKey(
      sessionKey,
      publicKey,
    );

    return { encryptedSessionKey: encryptedSessionKey };
  }

  async decryptSessionKey(encryptedSessionKey: string, privateKey: string) {
    const sessionKey = this.decryptWithPrivateKey(
      encryptedSessionKey,
      privateKey,
    );

    return { sessionKey: sessionKey };
  }

  async getUser(username: string | string[]) {
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

  generateRandomSessionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  encryptWithPublicKey(sessionKey: string, publicKey: string) {
    const encryptedMessage = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(sessionKey),
    );

    return encryptedMessage.toString('base64');
  }

  decryptWithPrivateKey(encryptedSessionKey: string, privateKey: string) {
    const decryptedMessage = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(encryptedSessionKey, 'base64'),
    );

    return decryptedMessage.toString();
  }
}
