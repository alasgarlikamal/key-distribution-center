import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConnectionRequestDto } from './dto/connection-request.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { KdcService } from './kdc.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class KdcGateway implements OnGatewayDisconnect, OnGatewayConnection {
  constructor(private readonly kdcService: KdcService) {}

  @WebSocketServer()
  server: Server;

  async handleDisconnect(socket: Socket) {
    const { username } = socket.handshake.headers;
    if (await this.kdcService.checkUserExists(username)) {
      await this.kdcService.disconnectSocketId(username);
    }
    console.log(`${socket.id} disconnected`);
  }
  async handleConnection(socket: Socket) {
    const { username } = socket.handshake.headers;

    if (!(await this.kdcService.checkUserExists(username))) {
      socket.disconnect();
      return;
    }

    console.log(`${socket.id} connected`);
    await this.kdcService.addSocketId(username, socket.id);
  }

  @SubscribeMessage('requestConnection')
  async requestConnection(socket: Socket, payload: ConnectionRequestDto) {
    const { to } = payload;
    const { username } = socket.handshake.headers;

    if (!(await this.kdcService.checkUserExists(to))) {
      this.server.to(socket.id).emit('failure', `User ${to} does not exist`);
      return;
    }

    if (!(await this.kdcService.isUserConnected(to))) {
      this.server.to(socket.id).emit('failure', `User ${to} is not connected`);
      return;
    }

    const recieverId = (await this.kdcService.getUser(to)).socketId;

    this.server.to(recieverId).emit('connectionRequested', {
      message: `${username} wishes to connect with you`,
      publicKey: payload.publicKey,
    });
  }

  @SubscribeMessage('message')
  async sendMessage(socket: Socket, payload: SendMessageDto) {
    const { to } = payload;
    const { username } = socket.handshake.headers;

    if (!(await this.kdcService.checkUserExists(to))) {
      this.server.to(socket.id).emit('failure', `User ${to} does not exist`);
      return;
    }

    if (!(await this.kdcService.isUserConnected(to))) {
      this.server.to(socket.id).emit('failure', `User ${to} is not connected`);
      return;
    }

    const recieverId = (await this.kdcService.getUser(to)).socketId;

    this.server.to(recieverId).emit('recieveMessage', {
      from: `${username} `,
      message: payload.message,
    });
  }
}
