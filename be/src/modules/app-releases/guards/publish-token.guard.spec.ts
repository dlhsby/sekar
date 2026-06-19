import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublishTokenGuard } from './publish-token.guard';

describe('PublishTokenGuard', () => {
  const makeContext = (headerToken?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: headerToken !== undefined ? { 'x-publish-token': headerToken } : {},
        }),
      }),
    }) as unknown as ExecutionContext;

  const guardWith = (configured?: string) =>
    new PublishTokenGuard({
      get: jest.fn().mockReturnValue(configured),
    } as unknown as ConfigService);

  it('fails closed when the token is not configured', () => {
    expect(() => guardWith(undefined).canActivate(makeContext('anything'))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a missing header', () => {
    expect(() => guardWith('secret').canActivate(makeContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a wrong token', () => {
    expect(() => guardWith('secret').canActivate(makeContext('nope'))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token of different length (timing-safe guard)', () => {
    expect(() => guardWith('secret').canActivate(makeContext('secretlonger'))).toThrow(
      UnauthorizedException,
    );
  });

  it('accepts the correct token', () => {
    expect(guardWith('secret').canActivate(makeContext('secret'))).toBe(true);
  });
});
