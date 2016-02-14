import * as redis from 'redis';
import * as socketio from 'socket.io';
import * as http from 'http';
import * as socketAuth from './client_socket_auth';

export function createHttpServer(): http.Server {
  return http.createServer(function (req: http.ServerRequest, res: http.ServerResponse): void {
    res.write(clientTemplate);
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

export const socketIOChannel = 'app-event';
export const redisPreifx = socketIOChannel;


export const authMessageTemplate = JSON.stringify({ user_id: '123' });
export const clientTemplate = `
<script src="/socket.io/socket.io.js"></script>
<script>
  var socket = io.connect('/');
  var handler = function (data) {
    console.log('Got data:');
    console.log(data);
    console.log('Seding data:');
    var response = { my: 'data-sent-from-client', socket_id: socket.id };
    console.log(response);
    socket.emit('my other event', response);
  }

  socket.on('connect', function() {
    var authDataSource = ` + JSON.stringify(authMessageTemplate) + `;
    console.log('Trying to authenticate with ' + authDataSource);
    var authData = ` + JSON.stringify(socketAuth.encrypt(authMessageTemplate)) + `;
    socket.emit('authentication', authData);
  });
  socket.on('news', handler);
  socket.on('` + socketIOChannel + `', handler);
</script>
`;
