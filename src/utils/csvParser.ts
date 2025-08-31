import { createReadStream } from "fs";
import { parse, CsvParserStream } from "fast-csv";
import { Offer, Hotel, DateUtils } from "../types";

/**
 * CSV parsing utilities with streaming support for large files
 */

export interface CsvParseOptions {
  delimiter?: string;
  skipHeader?: boolean;
  batchSize?: number;
}

export interface CsvParseResult<T> {
  data: T[];
  errors: string[];
  totalRows: number;
  validRows: number;
}

/**
 * Base CSV parser with streaming support
 */
export class CsvParser {
  /**
   * Parses CSV file with streaming support
   */
  static async parseFile<T>(
    filePath: string,
    rowParser: (row: any) => T,
    onBatch: (batch: T[]) => Promise<void>,
    options: CsvParseOptions = {},
  ): Promise<Omit<CsvParseResult<T>, "data">> {
    const { delimiter = ";", skipHeader = true, batchSize = 5000 } = options;

    let batch: T[] = [];
    const errors: string[] = [];
    let totalRows = 0;
    let validRows = 0;

    return new Promise((resolve, reject) => {
      const parser: CsvParserStream<any, any> = parse({
        delimiter,
        headers: true,
        ignoreEmpty: true,
        quote: '"',
      })
        .on("error", (error) => reject(error))
        .on("data", async (row) => {
          totalRows++;
          try {
            const parsedRow = rowParser(row);
            batch.push(parsedRow);
            validRows++;
            if (batch.length >= batchSize) {
              parser.pause();
              await onBatch(batch);
              batch = [];
              parser.resume();
            }
          } catch (error) {
            errors.push(
              `Row ${totalRows}: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        })
        .on("end", async (rowCount: number) => {
          if (batch.length > 0) {
            await onBatch(batch);
          }
          resolve({
            errors,
            totalRows: rowCount,
            validRows,
          });
        });

      createReadStream(filePath).pipe(parser);
    });
  }
}

/**
 * Hotel CSV parser
 */
export class HotelCsvParser {
  /**
   * Parses hotels CSV file
   */
  static async parseHotels(filePath: string): Promise<CsvParseResult<Hotel>> {
    const hotels: Hotel[] = [];
    const result = await CsvParser.parseFile<Hotel>(
      filePath,
      (row) => this.parseHotelRow(row),
      async (batch) => {
        hotels.push(...batch);
      },
      { delimiter: ";", skipHeader: true },
    );
    return { ...result, data: hotels };
  }

  /**
   * Parses a single hotel row
   */
  private static parseHotelRow(row: any): Hotel {
    // Strip quotes from each field
    const hotelIdStr = (row.hotelid || "").replace(/^"|"$/g, "");
    const hotelName = (row.hotelname || "").replace(/^"|"$/g, "");
    const hotelStarsStr = (row.hotelstars || "").replace(/^"|"$/g, "");

    const hotelId = parseInt(hotelIdStr, 10);
    const hotelStars = parseFloat(hotelStarsStr);

    if (
      isNaN(hotelId) ||
      isNaN(hotelStars) ||
      !hotelName ||
      hotelName.trim().length === 0
    ) {
      throw new Error(`Invalid hotel data in row: ${JSON.stringify(row)}`);
    }

    return {
      id: hotelId,
      name: hotelName,
      stars: hotelStars,
    };
  }
}

/**
 * Offer CSV parser
 */
export class OfferCsvParser {
  /**
   * Parses offers CSV file
   */
  static async parseOffers(
    filePath: string,
    onBatch: (batch: Offer[]) => Promise<void>,
  ): Promise<Omit<CsvParseResult<Offer>, "data">> {
    return CsvParser.parseFile<Offer>(
      filePath,
      (row) => this.parseOfferRow(row),
      onBatch,
      { delimiter: ",", skipHeader: true, batchSize: 1000 }, // Reduced from 1000 to 500 for better memory management
    );
  }

  /**
   * Parses a single offer row
   */
  private static parseOfferRow(row: any): Offer {
    // Strip quotes from each field and handle the actual column names from offers.csv
    const hotelIdStr = (row.hotelid || "").replace(/^"|"$/g, "");
    const priceStr = (row.price || "").replace(/^"|"$/g, "");
    const countAdultsStr = (row.countadults || "").replace(/^"|"$/g, "");
    const countChildrenStr = (row.countchildren || "").replace(/^"|"$/g, "");
    // Fix: Use correct column names from CSV - departuredate and returndate
    const outboundDepartureDateTimeStr = (row.departuredate || "").replace(
      /^"|"$/g,
      "",
    );
    const inboundDepartureDateTimeStr = (row.returndate || "").replace(
      /^"|"$/g,
      "",
    );
    
    // Debug logging for first few rows
    if (Math.random() < 0.0001) { // Log ~0.01% of rows
      console.log('DEBUG: Parsing offer row:', {
        hotelIdStr,
        priceStr,
        outboundDepartureDateTimeStr,
        inboundDepartureDateTimeStr
      });
    }
    const outboundDepartureAirport = (
      row.outbounddepartureairport || ""
    ).replace(/^"|"$/g, "");
    const inboundDepartureAirport = (row.inbounddepartureairport || "").replace(
      /^"|"$/g,
      "",
    );
    const outboundArrivalAirport = (row.outboundarrivalairport || "").replace(
      /^"|"$/g,
      "",
    );
    const inboundArrivalAirport = (row.inboundarrivalairport || "").replace(
      /^"|"$/g,
      "",
    );
    const outboundArrivalDateTimeStr = (row.outboundarrivaldatetime || "").replace(
      /^"|"$/g,
      "",
    );
    const inboundArrivalDateTimeStr = (row.inboundarrivaldatetime || "").replace(
      /^"|"$/g,
      "",
    );
    const mealType = (row.mealtype || "").replace(/^"|"$/g, "");
    const oceanViewStr = (row.oceanview || "").replace(/^"|"$/g, "");
    const roomType = (row.roomtype || "").replace(/^"|"$/g, "");

    // Validate required fields by key presence and value format
    if (
      !hotelIdStr ||
      !priceStr ||
      !countAdultsStr ||
      !countChildrenStr ||
      !outboundDepartureDateTimeStr ||
      !inboundDepartureDateTimeStr ||
      !outboundDepartureAirport ||
      !inboundDepartureAirport ||
      !outboundArrivalAirport ||
      !inboundArrivalAirport ||
      !mealType ||
      !oceanViewStr ||
      !roomType
    ) {
      throw new Error(
        `Missing required offer fields in row: ${JSON.stringify(row)}`,
      );
    }

    const hotelId = parseInt(hotelIdStr, 10);
    const price = parseFloat(priceStr);
    const countAdults = parseInt(countAdultsStr, 10);
    const countChildren = parseInt(countChildrenStr, 10);
    const outboundDepartureDateTime = DateUtils.parseDate(
      outboundDepartureDateTimeStr,
    );
    const inboundDepartureDateTime = DateUtils.parseDate(
      inboundDepartureDateTimeStr,
    );
    
    // Handle missing arrival datetime fields by calculating them
    let outboundArrivalDateTime: Date | null = null;
    let inboundArrivalDateTime: Date | null = null;
    
    if (outboundArrivalDateTimeStr) {
      outboundArrivalDateTime = DateUtils.parseDate(outboundArrivalDateTimeStr);
    } else if (outboundDepartureDateTime) {
      // Assume 2-hour flight time if arrival time not provided
      outboundArrivalDateTime = new Date(outboundDepartureDateTime.getTime() + 2 * 60 * 60 * 1000);
    }
    
    if (inboundArrivalDateTimeStr) {
      inboundArrivalDateTime = DateUtils.parseDate(inboundArrivalDateTimeStr);
    } else if (inboundDepartureDateTime) {
      // Assume 2-hour flight time if arrival time not provided
      inboundArrivalDateTime = new Date(inboundDepartureDateTime.getTime() + 2 * 60 * 60 * 1000);
    }

    // Debug logging for validation failures
    if (Math.random() < 0.0001) { // Log ~0.01% of rows
      console.log('DEBUG: Parsed values:', {
        hotelId: isNaN(hotelId) ? 'NaN' : hotelId,
        price: isNaN(price) ? 'NaN' : price,
        countAdults: isNaN(countAdults) ? 'NaN' : countAdults,
        countChildren: isNaN(countChildren) ? 'NaN' : countChildren,
        outboundDepartureDateTime: outboundDepartureDateTime ? 'valid' : 'null',
        inboundDepartureDateTime: inboundDepartureDateTime ? 'valid' : 'null',
        outboundArrivalDateTime: outboundArrivalDateTime ? 'valid' : 'null',
        inboundArrivalDateTime: inboundArrivalDateTime ? 'valid' : 'null'
      });
    }

    if (
      isNaN(hotelId) ||
      isNaN(price) ||
      isNaN(countAdults) ||
      isNaN(countChildren) ||
      !outboundDepartureDateTime ||
      !inboundDepartureDateTime ||
      !outboundArrivalDateTime ||
      !inboundArrivalDateTime
    ) {
      // Log validation failure details
      if (Math.random() < 0.001) { // Log 0.1% of validation failures
        console.log('DEBUG: Validation failed for row:', {
          hotelIdStr,
          priceStr,
          countAdultsStr,
          countChildrenStr,
          outboundDepartureDateTimeStr,
          inboundDepartureDateTimeStr,
          outboundArrivalDateTimeStr,
          inboundArrivalDateTimeStr,
          parsedValues: {
            hotelId,
            price,
            countAdults,
            countChildren,
            outboundDepartureDateTime,
            inboundDepartureDateTime,
            outboundArrivalDateTime,
            inboundArrivalDateTime
          }
        });
      }
      throw new Error(`Invalid offer data in row: ${JSON.stringify(row)}`);
    }

    return {
      hotelId,
      price,
      countAdults,
      countChildren,
      outboundDepartureDateTime,
      inboundDepartureDateTime,
      outboundArrivalDateTime: outboundArrivalDateTime!,
      inboundArrivalDateTime: inboundArrivalDateTime!,
      outboundDepartureAirport,
      inboundDepartureAirport,
      outboundArrivalAirport,
      inboundArrivalAirport,
      mealType,
      oceanView: oceanViewStr === "true",
      roomType,
      duration: DateUtils.calculateDuration(
        outboundDepartureDateTime,
        inboundDepartureDateTime,
      ),
    };
  }
}
