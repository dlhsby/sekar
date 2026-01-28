/**
 * Mock for socket.io-client
 *
 * Simulates Socket.IO client connection lifecycle and events
 *
 * IMPORTANT: This mock stores event handlers in a way that persists even when
 * mockSocket.on is replaced with jest.fn() in test beforeEach blocks.
 */

// Global storage for event handlers that persists across mock resets
const globalEventHandlers = {};

const mockSocket = {
  connected: false,

  // on() can be replaced by tests with jest.fn(), but we intercept it
  // to store handlers in global storage
  on: jest.fn((event, handler) => {
    globalEventHandlers[event] = handler;
    return mockSocket;
  }),

  off: jest.fn((event, handler) => {
    if (handler) {
      delete globalEventHandlers[event];
    }
    return mockSocket;
  }),

  emit: jest.fn((event, data, callback) => {
    // Simulate successful acknowledgment
    if (callback && typeof callback === 'function') {
      callback({ success: true, room: event });
    }
    return mockSocket;
  }),

  disconnect: jest.fn(() => {
    mockSocket.connected = false;
    // Trigger disconnect event if handler exists
    if (globalEventHandlers.disconnect) {
      globalEventHandlers.disconnect('io client disconnect');
    }
    return mockSocket;
  }),

  connect: jest.fn(() => {
    mockSocket.connected = true;
    // Trigger connect event asynchronously
    setTimeout(() => {
      if (globalEventHandlers.connect) {
        globalEventHandlers.connect();
      }
    }, 0);
    return mockSocket;
  }),

  join: jest.fn(),
  leave: jest.fn(),

  // Helper to manually trigger events in tests
  _triggerEvent: (event, data) => {
    if (globalEventHandlers[event]) {
      globalEventHandlers[event](data);
    }
  },

  // Helper to get registered handlers (for tests)
  _getHandlers: () => globalEventHandlers,

  // Helper to reset handlers
  _resetHandlers: () => {
    Object.keys(globalEventHandlers).forEach(key => delete globalEventHandlers[key]);
  },
};

// Wrap the original 'on' method to intercept even when replaced by tests
const originalOn = mockSocket.on;
Object.defineProperty(mockSocket, 'on', {
  get: () => originalOn,
  set: (newOn) => {
    // When tests replace mockSocket.on with jest.fn(), wrap it to still store handlers
    const wrappedOn = jest.fn((event, handler) => {
      globalEventHandlers[event] = handler;
      return newOn(event, handler);
    });
    // Copy mock properties so tests can still access mock.calls
    wrappedOn.mock = newOn.mock || { calls: [], results: [] };
    Object.defineProperty(mockSocket, 'on', {
      value: wrappedOn,
      writable: true,
      configurable: true,
    });
    return wrappedOn;
  },
  configurable: true,
});

const io = jest.fn(() => {
  return mockSocket;
});

// Export both default and named export
io.mockSocket = mockSocket;

module.exports = io;
module.exports.default = io;
module.exports.io = io;
