import { createApp } from '../app';

describe('App Import Test', () => {
  it('should import app successfully', () => {
    expect(createApp).toBeDefined();
  });
});