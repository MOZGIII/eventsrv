'use strict';
import * as socketio from 'socket.io';
import * as http from 'http';
import * as socketAuth from './client_socket_auth';
import * as template from './dev_client_templates';
import * as rsp from './redis_sub_pool';

export const socketIOChannel = 'app-event';
export const redisPrefix = socketIOChannel;

var httpServer: http.Server;
var socketIOServer: SocketIO.Server;
var redisSubPool: rsp.RedisSubPool;

export function createHttpServer(): http.Server {
  return http.createServer(function (req: http.ServerRequest, res: http.ServerResponse): void {
    res.write(template.clientTemplate(socketIOChannel, template.authMessageTemplate));
    res.end();
  });
}

export function createRedisSubPool(): rsp.RedisSubPool {
  var newRedisSubPool = new rsp.RedisSubPool();

  var client = newRedisSubPool.addClient('redis://192.168.33.10/3');

  newRedisSubPool.lock();
  return newRedisSubPool;
}

export function createSocketIOServer(httpServer: http.Server): SocketIO.Server {
  return socketio(httpServer);
}

function buildRedisChannelName(suffix: string): string {
  return redisPrefix ? (redisPrefix + '.' + suffix) : suffix;
}

export function connectionHandler(socket: socketAuth.AuthenticatableSocket) {
  console.log('Senging hello to ' + socket.id + ' with user ' + socket.auth.userId);
  socket.emit('news', {
    msg: 'hello',
    socket_id: socket.id
  });
  socket.on('my other event', function(data) {
    console.log(data);
  });

  var redisChannel: string = buildRedisChannelName(socket.auth.userId);
  var redisListener: rsp.MessageCallback = (message: string) => {
    socket.emit(socketIOChannel, message);
  };

  redisSubPool.addChannelListener(redisChannel, redisListener);

  socket.on('disconnect', () => {
    redisSubPool.removeChannelListener(redisChannel, redisListener);
  });
}

export function start() {
  console.log("Initializing...");

  httpServer = createHttpServer();
  socketIOServer = createSocketIOServer(httpServer);
  redisSubPool = createRedisSubPool();

  socketAuth.authenticateServer(socketIOServer, connectionHandler);
  httpServer.listen(3380);

  console.log("Initialization complete");
}
