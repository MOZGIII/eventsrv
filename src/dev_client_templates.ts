import * as socketAuth from './client_socket_auth';

export const authMessageTemplate = JSON.stringify({ user_id: '123' });
export function clientTemplate(socketIOChannel: string, authMessage: string) {
  return `
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
  socket.on('` + socketIOChannel + `', handler);
</script>
`;
}
