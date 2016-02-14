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
  return http.createServer(function(req: http.ServerRequest, res: http.ServerResponse): void {
    res.write(template.clientTemplate(socketIOChannel, template.authMessageTemplate));
    res.end();
  });
}

export function createRedisSubPool(): rsp.RedisSubPool {
  var newRedisSubPool = new rsp.RedisSubPool();

  var clientURL = 'redis://192.168.33.10/3';
  console.log('Connecting to redis server at ' + clientURL);
  var client = newRedisSubPool.addClient(clientURL);
  client.on('ready', () => {
    console.log('Redis connection to ' + clientURL + ' is ready');
  });

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
    console.log('Sending data for client ' + socket.id + ' from channel ' + redisChannel, message);
    socket.emit(socketIOChannel, message);
  };

  console.log('Adding redis channel listener for client ' + socket.id + ' at channel ' + redisChannel);
  redisSubPool.addChannelListener(redisChannel, redisListener);

  socket.on('disconnect', () => {
    console.log('Removing redis channel listener for client ' + socket.id + ' at channel ' + redisChannel);
    redisSubPool.removeChannelListener(redisChannel, redisListener);
  });
}

export function start() {
  console.log('Initializing...');

  // Create everything
  httpServer = createHttpServer();
  socketIOServer = createSocketIOServer(httpServer);
  redisSubPool = createRedisSubPool();

  // Add auth mechanism
  socketAuth.authenticateServer(socketIOServer, connectionHandler);

  // Make sure connections to all redis`es is established
  redisSubPool.once('allReady', () => { allReady(); });

  var allReady = () => {
    // Start listening
    httpServer.listen(3380);

    console.log('Initialization complete');
  };
}
