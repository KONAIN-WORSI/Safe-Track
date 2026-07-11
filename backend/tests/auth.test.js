const { extractToken } = require('../middleware/auth');

describe('extractToken', () => {
  it('extracts a bearer token from an authorization header', () => {
    expect(extractToken({ headers: { authorization: 'Bearer test-token' } })).toBe('test-token');
  });

  it('extracts a token from socket auth payload', () => {
    expect(extractToken({ handshake: { auth: { token: 'socket-token' } } })).toBe('socket-token');
  });

  it('returns null when no token is present', () => {
    expect(extractToken({ headers: {} })).toBeNull();
  });
});
