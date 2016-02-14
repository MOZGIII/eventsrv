import * as crypto from 'crypto';
import * as jsv from './json_schema_validation';
import * as json from './typings/json';

const algorithm = 'aes-256-ctr';
const password = process.env.CLIENT_SOCKET_KEY;

if (!password) {
  throw new Error('You have to set CLIENT_SOCKET_KEY env variable');
}

const authMessageSchema = jsv.loadValidator('json/auth_message.json');

export function decrypt(text: string) {
  var decipher = crypto.createDecipher(algorithm, password)
  var dec = decipher.update(text, 'hex', 'utf8')
  dec += decipher.final('utf8');
  return dec;
}

export function encrypt(text: string) {
  var cipher = crypto.createCipher(algorithm, password)
  var crypted = cipher.update(text, 'utf8', 'hex')
  crypted += cipher.final('hex');
  return crypted;
}

export class Auth {
  static fromEncryptedToken(token: string): Auth {
    var decryptedToken = decrypt(token);

    // Will throw on failure
    var object: any = JSON.parse(decryptedToken);

    // Will throw on invalid format
    authMessageSchema.throwingValidate(object);

    // Now the object is valid, pass it along
    return new Auth(<json.AuthMessage>object);
  }

  // External id of currently authorized user.
  userId: string;

  constructor(authMessage: json.AuthMessage) {
    this.userId = authMessage.user_id;
  }

  isValid(): boolean {
    return this.userId != null;
  }
}

export interface AuthenticatableSocket extends SocketIO.Socket {
  auth: Auth
}

export function authenticateServer(server: SocketIO.Server, successfulAuthHandler: (socket: SocketIO.Socket) => void): void {
  server.sockets.on('connection', makeAuthHandler(5000, successfulAuthHandler));
}

export function makeAuthHandler(timeout = 5000, successfulAuthHandler: (socket: SocketIO.Socket) => void) {
  return (socket: AuthenticatableSocket): void => {
    socket.auth = null;

    var authFailureAction = () => {
      socket.disconnect();
    }

    var authSuccessAction = () => {
      successfulAuthHandler(socket);
    }

    socket.once('authentication', (token: string) => {
      if (authTimer == null) {
        console.log('Client ' + socket.id + ' had tried to authenticate, but timeout happened before message arrived');
        return;
      } else {
        clearTimeout(authTimer);
        authTimer = null;
      }
      console.log('Client ' + socket.id + ' is trying to authenticate with the following token:', token);

      try {
        var newAuth = Auth.fromEncryptedToken(token);
      } catch (ex) {
        console.log('Client ' + socket.id + ' disconnected due to exception in authentication code:', ex.message);
        if (typeof ex.stack != 'undefined') {
          console.log(ex.stack);
        } else {
          console.log(ex);
        }
        authFailureAction();
        return;
      }

      if (!newAuth.isValid()) {
        console.log('Client ' + socket.id + ' disconnected due to invalid authentication');
        authFailureAction();
        return;
      }

      // Assign new auth on success
      socket.auth = newAuth;

      socket.once('disconnect', () => {
        // Reset authentication cause we are not connected anymore
        socket.auth = null;
      })

      console.log('Client ' + socket.id + ' authenticated successfully');
      console.log(socket.auth);
      authSuccessAction();
    });

    var authTimer = setTimeout(() => {
      authTimer = null;
      if (socket.auth == null) {
        console.log('Client ' + socket.id + ' disconnected due to authentication timeout');
        authFailureAction();
        return;
      }
      console.error('DANGER: some kind of race condition happened for client id ' + socket.id);
    }, timeout);

    console.log('Client ' + socket.id + ' connected, waiting for authentication');
  }
}
