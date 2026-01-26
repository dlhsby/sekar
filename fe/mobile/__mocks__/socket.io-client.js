/**
 * Mock for socket.io-client
 */

const mockSocket = {
  connected: false,
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn((event, data, callback) => {
    // Simulate successful acknowledgment
    if (callback && typeof callback === 'function') {
      callback({ success: true, room: event });
    }
  }),
  disconnect: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
};

const io = jest.fn(() => mockSocket);

// Export both default and named export
io.mockSocket = mockSocket;

module.exports = io;
module.exports.default = io;
module.exports.io = io;
