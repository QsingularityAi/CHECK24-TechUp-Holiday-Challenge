import { Offer } from '../types';

describe('Minimal Test with Import', () => {
  it('should work with type import', () => {
    const offer: Partial<Offer> = {
      price: 100
    };
    expect(offer.price).toBe(100);
  });
});