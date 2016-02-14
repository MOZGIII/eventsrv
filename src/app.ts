import * as redis from 'redis';
import * as socketio from 'socket.io';
import * as http from 'http';
import * as socketAuth from './client_socket_auth';
import * as template from './dev_client_templates';

export const socketIOChannel = 'app-event';
export const redisPreifx = socketIOChannel;

export function createHttpServer(): http.Server {
  return http.createServer(function (req: http.ServerRequest, res: http.ServerResponse): void {
    res.write(template.clientTemplate(socketIOChannel, template.authMessageTemplate));
    res.end();
  });
}

export function createRedisClients(opts?: redis.ClientOpts): redis.RedisClient[] {
  var client = redis.createClient('redis://192.168.33.10/3');
  return [client];
}

export function createSocketIOServer(httpServer: http.Server): SocketIO.Server {
  return socketio(httpServer);
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
}

var httpServer: http.Server;
var socketIOServer: SocketIO.Server;
var subscribers: redis.RedisClient[];

export function start() {
  console.log("Initializing...");

  httpServer = createHttpServer();
  socketIOServer = createSocketIOServer(httpServer);
  // subscribers = createRedisClients();

  socketAuth.authenticateServer(socketIOServer, connectionHandler);
  httpServer.listen(3380);

  console.log("Initialization complete");
}
