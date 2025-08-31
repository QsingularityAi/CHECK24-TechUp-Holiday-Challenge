import { UserShortlist, ShortlistItem, PriceAlert } from '../../types';
import { randomUUID } from 'crypto';

/**
 * Service for managing user shortlists and price alerts
 */
export class ShortlistService {
  private shortlists = new Map<string, UserShortlist>();
  private priceAlerts = new Map<string, PriceAlert>();
  private userShortlistsIndex = new Map<string, string[]>(); // userId -> shortlistIds

  /**
   * Creates a new shortlist for a user
   */
  createShortlist(userId: string, name: string): UserShortlist {
    const shortlist: UserShortlist = {
      id: randomUUID(),
      userId,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: []
    };

    this.shortlists.set(shortlist.id, shortlist);
    
    // Update user index
    if (!this.userShortlistsIndex.has(userId)) {
      this.userShortlistsIndex.set(userId, []);
    }
    this.userShortlistsIndex.get(userId)!.push(shortlist.id);

    return shortlist;
  }

  /**
   * Gets all shortlists for a user
   */
  getUserShortlists(userId: string): UserShortlist[] {
    const shortlistIds = this.userShortlistsIndex.get(userId) || [];
    return shortlistIds
      .map(id => this.shortlists.get(id))
      .filter(Boolean) as UserShortlist[];
  }

  /**
   * Gets a specific shortlist by ID
   */
  getShortlist(shortlistId: string): UserShortlist | null {
    return this.shortlists.get(shortlistId) || null;
  }

  /**
   * Adds a hotel to a shortlist
   */
  addToShortlist(
    shortlistId: string,
    hotelId: number,
    priceWhenAdded: number,
    offerId?: string,
    notes?: string
  ): ShortlistItem | null {
    const shortlist = this.shortlists.get(shortlistId);
    if (!shortlist) {
      return null;
    }

    // Check if hotel is already in shortlist
    const existingItem = shortlist.items.find(item => item.hotelId === hotelId);
    if (existingItem) {
      return existingItem;
    }

    const item: ShortlistItem = {
      id: randomUUID(),
      hotelId,
      addedAt: new Date(),
      priceWhenAdded,
      ...(offerId && { offerId }),
      ...(notes && { notes })
    };

    shortlist.items.push(item);
    shortlist.updatedAt = new Date();

    return item;
  }

  /**
   * Removes a hotel from a shortlist
   */
  removeFromShortlist(shortlistId: string, hotelId: number): boolean {
    const shortlist = this.shortlists.get(shortlistId);
    if (!shortlist) {
      return false;
    }

    const initialLength = shortlist.items.length;
    shortlist.items = shortlist.items.filter(item => item.hotelId !== hotelId);
    
    if (shortlist.items.length < initialLength) {
      shortlist.updatedAt = new Date();
      return true;
    }

    return false;
  }

  /**
   * Updates notes for a shortlist item
   */
  updateShortlistItemNotes(shortlistId: string, hotelId: number, notes: string): boolean {
    const shortlist = this.shortlists.get(shortlistId);
    if (!shortlist) {
      return false;
    }

    const item = shortlist.items.find(item => item.hotelId === hotelId);
    if (!item) {
      return false;
    }

    item.notes = notes;
    shortlist.updatedAt = new Date();
    return true;
  }

  /**
   * Deletes a shortlist
   */
  deleteShortlist(shortlistId: string): boolean {
    const shortlist = this.shortlists.get(shortlistId);
    if (!shortlist) {
      return false;
    }

    // Remove from user index
    const userShortlists = this.userShortlistsIndex.get(shortlist.userId);
    if (userShortlists) {
      const index = userShortlists.indexOf(shortlistId);
      if (index > -1) {
        userShortlists.splice(index, 1);
      }
    }

    this.shortlists.delete(shortlistId);
    return true;
  }

  /**
   * Creates a price alert for a hotel
   */
  createPriceAlert(userId: string, hotelId: number, targetPrice: number): PriceAlert {
    const alert: PriceAlert = {
      id: randomUUID(),
      userId,
      hotelId,
      targetPrice,
      isActive: true,
      createdAt: new Date(),
      lastChecked: new Date()
    };

    this.priceAlerts.set(alert.id, alert);
    return alert;
  }

  /**
   * Gets all price alerts for a user
   */
  getUserPriceAlerts(userId: string): PriceAlert[] {
    return Array.from(this.priceAlerts.values())
      .filter(alert => alert.userId === userId);
  }

  /**
   * Updates price alert status
   */
  updatePriceAlert(alertId: string, isActive: boolean): boolean {
    const alert = this.priceAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.isActive = isActive;
    return true;
  }

  /**
   * Triggers a price alert (marks as triggered)
   */
  triggerPriceAlert(alertId: string): boolean {
    const alert = this.priceAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.triggered = new Date();
    alert.isActive = false; // Deactivate after triggering
    return true;
  }

  /**
   * Deletes a price alert
   */
  deletePriceAlert(alertId: string): boolean {
    return this.priceAlerts.delete(alertId);
  }

  /**
   * Gets all active price alerts (for monitoring)
   */
  getActivePriceAlerts(): PriceAlert[] {
    return Array.from(this.priceAlerts.values())
      .filter(alert => alert.isActive);
  }

  /**
   * Checks if a hotel is in any of user's shortlists
   */
  isHotelShortlisted(userId: string, hotelId: number): boolean {
    const userShortlists = this.getUserShortlists(userId);
    return userShortlists.some(shortlist =>
      shortlist.items.some(item => item.hotelId === hotelId)
    );
  }

  /**
   * Gets statistics about shortlists
   */
  getStats(): {
    totalShortlists: number;
    totalItems: number;
    totalUsers: number;
    totalPriceAlerts: number;
    activePriceAlerts: number;
  } {
    let totalItems = 0;
    for (const shortlist of this.shortlists.values()) {
      totalItems += shortlist.items.length;
    }

    const activePriceAlerts = this.getActivePriceAlerts().length;

    return {
      totalShortlists: this.shortlists.size,
      totalItems,
      totalUsers: this.userShortlistsIndex.size,
      totalPriceAlerts: this.priceAlerts.size,
      activePriceAlerts
    };
  }

  /**
   * Exports shortlist data (for backup/persistence)
   */
  exportData(): {
    shortlists: UserShortlist[];
    priceAlerts: PriceAlert[];
  } {
    return {
      shortlists: Array.from(this.shortlists.values()),
      priceAlerts: Array.from(this.priceAlerts.values())
    };
  }

  /**
   * Imports shortlist data (for restore)
   */
  importData(data: { shortlists: UserShortlist[]; priceAlerts: PriceAlert[] }): void {
    // Clear existing data
    this.shortlists.clear();
    this.priceAlerts.clear();
    this.userShortlistsIndex.clear();

    // Import shortlists
    for (const shortlist of data.shortlists) {
      this.shortlists.set(shortlist.id, shortlist);
      
      if (!this.userShortlistsIndex.has(shortlist.userId)) {
        this.userShortlistsIndex.set(shortlist.userId, []);
      }
      this.userShortlistsIndex.get(shortlist.userId)!.push(shortlist.id);
    }

    // Import price alerts
    for (const alert of data.priceAlerts) {
      this.priceAlerts.set(alert.id, alert);
    }
  }
}

// Singleton instance
export const shortlistService = new ShortlistService();
