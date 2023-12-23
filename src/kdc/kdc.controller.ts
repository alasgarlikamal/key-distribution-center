import { Body, Controller, Get, Post } from '@nestjs/common';
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
}
