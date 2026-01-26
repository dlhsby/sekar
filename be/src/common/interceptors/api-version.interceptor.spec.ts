import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of } from 'rxjs';
import { ApiVersionInterceptor } from './api-version.interceptor';

describe('ApiVersionInterceptor', () => {
  let interceptor: ApiVersionInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;
  let mockResponse: any;
  let loggerDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new ApiVersionInterceptor();

    mockRequest = {
      headers: {},
      method: 'GET',
      url: '/api/test',
    };

    mockResponse = {
      setHeader: jest.fn(),
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ data: 'test' })),
    };

    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('intercept', () => {
    it('should log API version when X-API-Version header is provided', (done) => {
      mockRequest.headers['x-api-version'] = 'v1';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(loggerDebugSpy).toHaveBeenCalledWith('API Version v1 requested for GET /api/test');
          done();
        },
        error: done,
      });
    });

    it('should log API version v2 when requested', (done) => {
      mockRequest.headers['x-api-version'] = 'v2';
      mockRequest.method = 'POST';
      mockRequest.url = '/api/users';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(loggerDebugSpy).toHaveBeenCalledWith(
            'API Version v2 requested for POST /api/users',
          );
          done();
        },
        error: done,
      });
    });

    it('should not log when X-API-Version header is not provided', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(loggerDebugSpy).not.toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });

    it('should set X-API-Version response header to v1', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(mockResponse.setHeader).toHaveBeenCalledWith('X-API-Version', 'v1');
          done();
        },
        error: done,
      });
    });

    it('should set response header regardless of request version', (done) => {
      mockRequest.headers['x-api-version'] = 'v2';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(mockResponse.setHeader).toHaveBeenCalledWith('X-API-Version', 'v1');
          done();
        },
        error: done,
      });
    });

    it('should pass through the response from next handler', (done) => {
      const expectedResponse = { data: 'test' };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual(expectedResponse);
          expect(mockCallHandler.handle).toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });

    it('should call switchToHttp to get request and response', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(mockExecutionContext.switchToHttp).toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });
  });
});
