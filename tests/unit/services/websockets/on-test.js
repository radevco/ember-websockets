import Ember from 'ember';
import { module, test } from 'qunit';
import SocketsService from 'dummy/services/websockets';

let component;
let mockServer;
let ConsumerComponent;
let originalWebSocket;
let service;

module('Sockets Service - on(*) tests', {
  setup() {
    originalWebSocket = window.WebSocket;
    window.WebSocket = window.MockWebSocket;

    service = SocketsService.create();
    mockServer = new window.MockServer('ws://example.com:7000/');

    ConsumerComponent = Ember.Component.extend({
      socketService: service,
      socket: null,
      willDestroyElement() {
        this.socketService.closeSocketFor('ws://example.com:7000/');
      }
    });
  },
  teardown() {
    window.WebSocket = originalWebSocket;

    Ember.run(() => {
      component.destroy();
      service.destroy();
      mockServer.close();
    });
  }
});

test('that on(open) and on(close) work correctly', assert => {
  var done = assert.async();
  assert.expect(3);

  component = ConsumerComponent.extend({
    init() {
      this._super(...arguments);
      const socket = this.socketService.socketFor('ws://example.com:7000/');

      socket.on('open', this.myOpenHandler, this);
      socket.on('close', this.myCloseHandler, this);

      assert.equal(socket.listeners.length, 2);
    },

    myOpenHandler() {
      assert.ok(true);
      this.socketService.socketFor('ws://example.com:7000/').close();
    },

    myCloseHandler() {
      assert.ok(true);
      done();
    }
  }).create();
});

test('that on(message) works correctly', assert => {
  var done = assert.async();
  var sampleMessage = 'SamepleData';

  assert.expect(2);

  mockServer.on('connection', server => {
    server.send(sampleMessage);
  });

  component = ConsumerComponent.extend({
    init() {
      this._super.apply(this, arguments);
      var socket = this.socketService.socketFor('ws://example.com:7000/');

      socket.on('message', this.myMessageHandler, this);
      this.socket = socket;
    },

    myMessageHandler(event) {
      assert.equal(event.data, sampleMessage);
      assert.ok(true);

      this.socket.off('message', this.myMessageHandler);
      done();
    }
  }).create();
});
