'use strict';
import * as redis from 'redis';
import { MutiValueHash } from './multi_value_hash';

// Public interface
export interface MessageCallback {
  (message: string, channel?: string, redisClient?: redis.RedisClient): void
}

export class RedisSubPool {
  // Pool is locked after start.
  pool: Array<redis.RedisClient> = [];
  locked: boolean = false;

  messageHandlers: MutiValueHash<string, MessageCallback> = new MutiValueHash<string, MessageCallback>();

  addExisingClient(redisClient: redis.RedisClient) {
    this.throwIfLocked();
    if (redisClient.config)
    this.pool.push(redisClient);
  }

  addClient(redisClientParams: redis.ClientOpts|string) {
    this.throwIfLocked();
    var newClient = redis.createClient(redisClientParams);
    this.addExisingClient(newClient);
  }

  lock() {
    this.throwIfLocked();

    // Lock the pool
    this.locked = true;

    this.forEachClient((client: redis.RedisClient) => {
      client.on('message', (channel: string, message: string) => {
        this.messageHandlers.get(channel).forEach((cb: MessageCallback) => {
          cb(message, channel, client);
        }, this);
      });
    });
  }

  quit() {
    this.throwIfLocked();
    this.forEachClient((client: redis.RedisClient) => {
      client.quit();
    });
  }

  addChannelListener(channel: string, onMessage: MessageCallback) {
    if (!this.messageHandlers.exist(channel)) {
      this.subscribe(channel);
    }

    this.messageHandlers.add(channel, onMessage);
  }

  removeChannelListener(channel: string, onMessage: MessageCallback) {
    this.messageHandlers.remove(channel, onMessage);

    if (!this.messageHandlers.exist(channel)) {
      this.unsubscribe(channel);
    }
  }

  private

  subscribe(channel: string) {
    this.throwIfNotLocked();
    this.forEachClient((client: redis.RedisClient) => {
      if (!client.subscribe(channel)) {
        throw new Error('Redis client cound not subscribe for some reason');
      }
    });
  }

  unsubscribe(channel: string) {
    this.throwIfNotLocked();
    this.forEachClient((client: redis.RedisClient) => {
      if (!client.unsubscribe(channel)) {
        if (!client.connected) {
          throw new Error('Redis client cound not unsubscribe while disconnected');
        } else {
          throw new Error('Redis client cound not unsubscribe for some reason (it was connected though)');
        }
      }
    });
  }


  forEachClient(callback: (client: redis.RedisClient) => void) {
    for (var i = this.pool.length - 1; i >= 0; i--) {
      callback(this.pool[i]);
    }
  }

  throwIfLocked() {
    if (this.locked) {
      throw new Error('Pool was already locked when warmup action happened');
    }
  }

  throwIfNotLocked() {
    if (!this.locked) {
      throw new Error('Pool was not locked yet when workflow action happened');
    }
  }
}
