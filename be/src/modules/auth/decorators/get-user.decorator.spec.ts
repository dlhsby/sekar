import {} from '@nestjs/common';
import { GetUser } from './get-user.decorator';

describe('GetUser Decorator', () => {
  it('should be defined', () => {
    expect(GetUser).toBeDefined();
  });

  it('should be a function', () => {
    expect(typeof GetUser).toBe('function');
  });

  it('should create a parameter decorator', () => {
    const decorator = GetUser();
    expect(decorator).toBeDefined();
  });
});
