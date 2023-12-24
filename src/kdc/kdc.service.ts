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

    return { privateKey, publicKey };
  }

  // async generateEncryptedSessionKey(publicKey: string) {
  //   const sessionKey = this.generateRandomSessionKey();

  //   const encryptedSessionKey = this.encryptMessage(sessionKey, publicKey);

  //   return { encryptedSessionKey };
  // }

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
    return { sessionKey: crypto.randomBytes(32).toString('hex') };
  }

  encryptSessionKey(sessionKey: string, publicKey: string) {
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

  decryptSessionKey(sessionKey: string, privateKey: string) {
    const decryptedMessage = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(sessionKey, 'base64'),
    );

    return decryptedMessage.toString();
  }

  encryptMessage(message: string, sessionKey: string) {
    // Generate a random initialization vector (IV)
    const iv = crypto.randomBytes(16);

    // Create a cipher object with AES-GCM algorithm
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(sessionKey, 'hex'),
      iv,
    );

    // Update the cipher with the message
    const encryptedBuffer = Buffer.concat([
      cipher.update(message, 'utf-8'),
      cipher.final(),
    ]);

    // Get the authentication tag
    const tag = cipher.getAuthTag();

    // Combine IV, tag, and encrypted message into a single string
    const encryptedMessage =
      iv.toString('hex') +
      tag.toString('hex') +
      encryptedBuffer.toString('hex');

    // Return the encrypted message along with the IV and tag
    return {
      encryptedMessage,
    };
  }

  decryptMessage(message: string, sessionKey: string) {
    // Extract IV, tag, and encrypted message from the combined string
    const iv = Buffer.from(message.substring(0, 32), 'hex');
    const tag = Buffer.from(message.substring(32, 64), 'hex');
    const encryptedMessage = Buffer.from(message.substring(64), 'hex');

    // Create a decipher object with AES-GCM algorithm
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(sessionKey, 'hex'),
      iv,
    );

    // Set the authentication tag
    decipher.setAuthTag(tag);

    // Update the decipher with the encrypted message
    const decryptedBuffer = Buffer.concat([
      decipher.update(encryptedMessage),
      decipher.final(),
    ]);

    // Return the decrypted message
    return decryptedBuffer.toString('utf-8');
  }
}
