import { SearchCriteria, BestHotelOffer, Offer, Hotel } from "../../types";

/**
 * Common interface for all search engines
 */
export interface ISearchEngine {
  findBestOffersByHotel(criteria: SearchCriteria): Promise<BestHotelOffer[]>;
  findHotelOffers(hotelId: number, criteria: SearchCriteria): Promise<Offer[]>;
  getHotel(hotelId: number): Hotel | undefined;
  getPerformanceStats(): any;
  getConfig?(): any;
  initialize?(): Promise<void>;
  cleanup?(): void;
}