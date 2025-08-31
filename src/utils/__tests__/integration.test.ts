import { HotelCsvParser } from '../csvParser';
import { join } from 'path';

describe('CSV Parser Integration Tests', () => {
  it('should parse the actual hotels.csv file', async () => {
    const filePath = join(__dirname, '../../../data/hotels.csv');
    
    const result = await HotelCsvParser.parseHotels(filePath);
    
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.errors.length).toBe(0);
    expect(result.validRows).toBe(result.data.length);
    
    // Check first hotel
    const firstHotel = result.data[0];
    expect(firstHotel?.id).toBe(1);
    expect(firstHotel?.name).toBe('Iberostar Playa de Muro');
    expect(firstHotel?.stars).toBe(4.0);
    
    // Check that all hotels have valid data
    result.data.forEach(hotel => {
      expect(hotel.id).toBeGreaterThan(0);
      expect(hotel.name).toBeTruthy();
      expect(hotel.stars).toBeGreaterThanOrEqual(0);
      expect(hotel.stars).toBeLessThanOrEqual(5);
    });
  });
});