import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { RegisterDto } from './dto/register.dto';
import { KdcService } from './kdc.service';

@Controller('kdc')
export class KdcController {
  constructor(private readonly kdcService: KdcService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return await this.kdcService.register(registerDto);
  }

  @Post('keys')
  async generateKeys(@Body('username') username: string) {
    return await this.kdcService.generateKeyPair(username);
  }

  @Get('users')
  async getUsers() {
    return await this.kdcService.getUsers();
  }

  @Get('session-key')
  getSessionKey() {
    return this.kdcService.generateRandomSessionKey();
  }

  @Post('session-key/encrypt')
  async encryptSessionKey(
    @Body('sessionKey') sessionKey: string,
    @Body('encryptionKey') encryptionKey: string,
  ) {
    return this.kdcService.encryptSessionKey(sessionKey, encryptionKey);
  }

  @Post('session-key/decrypt')
  async decryptSessionKey(
    @Body('sessionKey') sessionKey: string,
    @Body('decryptionKey') decryptionKey: string,
  ) {
    return this.kdcService.decryptSessionKey(sessionKey, decryptionKey);
  }

  @Post('encrypt')
  async encryptMessage(
    @Body('message') message: string,
    @Body('sessionKey') sessionKey: string,
  ) {
    return this.kdcService.encryptMessage(message, sessionKey);
  }

  @Post('decrypt')
  async decryptMessage(
    @Body('message') message: string,
    @Body('sessionKey') sessionKey: string,
  ) {
    return this.kdcService.decryptMessage(message, sessionKey);
  }
}
