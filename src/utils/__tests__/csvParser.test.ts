import { promises as fs } from "fs";
import { join } from "path";
import { HotelCsvParser, OfferCsvParser, CsvParser } from "../csvParser";
import { Hotel, Offer } from "../../types";

// Test data directory
const testDataDir = join(__dirname, "testdata");

describe("HotelCsvParser", () => {
  beforeAll(async () => {
    // Create test data directory
    await fs.mkdir(testDataDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test data directory
    try {
      await fs.rm(testDataDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it("should parse valid hotel CSV data", async () => {
    const csvContent = `"hotelid";"hotelname";"hotelstars"
"1";"Hotel Paradise";"4.0"
"2";"Beach Resort";"3.5"
"3";"Luxury Suite";"5.0"`;

    const filePath = join(testDataDir, "hotels.csv");
    await fs.writeFile(filePath, csvContent);

    const result = await HotelCsvParser.parseHotels(filePath);

    expect(result.data).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
    expect(result.totalRows).toBe(3);
    expect(result.validRows).toBe(3);

    const hotel1 = result.data[0]!;
    expect(hotel1.id).toBe(1);
    expect(hotel1.name).toBe("Hotel Paradise");
    expect(hotel1.stars).toBe(4.0);

    const hotel2 = result.data[1]!;
    expect(hotel2.id).toBe(2);
    expect(hotel2.name).toBe("Beach Resort");
    expect(hotel2.stars).toBe(3.5);

    const hotel3 = result.data[2]!;
    expect(hotel3.id).toBe(3);
    expect(hotel3.name).toBe("Luxury Suite");
    expect(hotel3.stars).toBe(5.0);
  });

  it("should handle invalid hotel data with errors", async () => {
    const csvContent = `"hotelid";"hotelname";"hotelstars"
"1";"Hotel Paradise";"4.0"
"invalid";"Beach Resort";"3.5"
"3";"";"5.0"`;

    const filePath = join(testDataDir, "hotels_with_errors.csv");
    await fs.writeFile(filePath, csvContent);

    const result = await HotelCsvParser.parseHotels(filePath);

    expect(result.data).toHaveLength(1); // Only one valid hotel
    expect(result.errors).toHaveLength(2); // Two errors
    expect(result.totalRows).toBe(3);
    expect(result.validRows).toBe(1);

    const validHotel = result.data[0]!;
    expect(validHotel.id).toBe(1);
    expect(validHotel.name).toBe("Hotel Paradise");
    expect(validHotel.stars).toBe(4.0);
  });

  it("should handle empty hotel CSV file", async () => {
    const csvContent = `"hotelid";"hotelname";"hotelstars"`;

    const filePath = join(testDataDir, "hotels_empty.csv");
    await fs.writeFile(filePath, csvContent);

    const result = await HotelCsvParser.parseHotels(filePath);

    expect(result.data).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(result.totalRows).toBe(0);
    expect(result.validRows).toBe(0);
  });
});

describe("OfferCsvParser", () => {
  beforeAll(async () => {
    // Create test data directory
    await fs.mkdir(testDataDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test data directory
    try {
      await fs.rm(testDataDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it("should parse valid offer CSV data", async () => {
    const csvContent = `"hotelid","price","countadults","countchildren","departuredate","returndate","outbounddepartureairport","inbounddepartureairport","outboundarrivalairport","inboundarrivalairport","mealtype","oceanview","roomtype"
"1","1200.50","2","0","2024-06-01 10:00","2024-06-08 14:00","FRA","PMI","PMI","FRA","All Inclusive","true","Double Room"
"2","900.00","1","1","2024-07-15 08:00","2024-07-22 12:00","MUC","PMI","PMI","MUC","Half Board","false","Family Room"`;

    const filePath = join(testDataDir, "offers.csv");
    await fs.writeFile(filePath, csvContent);

    const offers: Offer[] = [];
    const result = await OfferCsvParser.parseOffers(filePath, async (batch) => {
      offers.push(...batch);
    });

    expect(offers).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.totalRows).toBe(2);
    expect(result.validRows).toBe(2);

    const offer1 = offers[0]!;
    expect(offer1.hotelId).toBe(1);
    expect(offer1.price).toBe(1200.5);
    expect(offer1.countAdults).toBe(2);
    expect(offer1.countChildren).toBe(0);
    expect(offer1.outboundDepartureAirport).toBe("FRA");
    expect(offer1.inboundDepartureAirport).toBe("PMI");
    expect(offer1.mealType).toBe("All Inclusive");
    expect(offer1.oceanView).toBe(true);
    expect(offer1.roomType).toBe("Double Room");
    expect(offer1.duration).toBe(7);

    const offer2 = offers[1]!;
    expect(offer2.hotelId).toBe(2);
    expect(offer2.price).toBe(900.0);
    expect(offer2.countAdults).toBe(1);
    expect(offer2.countChildren).toBe(1);
    expect(offer2.oceanView).toBe(false);
    expect(offer2.duration).toBe(7);
  });

  it("should handle missing required fields", async () => {
    const csvContent = `"hotelid","price","countadults","countchildren","departuredate","returndate","outbounddepartureairport","inbounddepartureairport","outboundarrivalairport","inboundarrivalairport","mealtype","oceanview","roomtype"
"1","","2","0","2024-06-01 10:00","2024-06-08 14:00","FRA","PMI","PMI","FRA","All Inclusive","true","Double Room"`;

    const filePath = join(testDataDir, "offers_missing_fields.csv");
    await fs.writeFile(filePath, csvContent);

    const offers: Offer[] = [];
    const result = await OfferCsvParser.parseOffers(filePath, async (batch) => {
      offers.push(...batch);
    });

    expect(offers).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.totalRows).toBe(1);
    expect(result.validRows).toBe(0);
  });

  it("should handle invalid data types", async () => {
    const csvContent = `"hotelid","price","countadults","countchildren","departuredate","returndate","outbounddepartureairport","inbounddepartureairport","outboundarrivalairport","inboundarrivalairport","mealtype","oceanview","roomtype"
"invalid","1200.50","not_a_number","0","2024-06-01 10:00","2024-06-08 14:00","FRA","PMI","PMI","FRA","All Inclusive","true","Double Room"`;

    const filePath = join(testDataDir, "offers_invalid_types.csv");
    await fs.writeFile(filePath, csvContent);

    const offers: Offer[] = [];
    const result = await OfferCsvParser.parseOffers(filePath, async (batch) => {
      offers.push(...batch);
    });

    expect(offers).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.totalRows).toBe(1);
    expect(result.validRows).toBe(0);
  });

  it("should handle invalid date formats", async () => {
    const csvContent = `"hotelid","price","countadults","countchildren","departuredate","returndate","outbounddepartureairport","inbounddepartureairport","outboundarrivalairport","inboundarrivalairport","mealtype","oceanview","roomtype"
"1","1200.50","2","0","invalid-date","2024-06-08 14:00","FRA","PMI","PMI","FRA","All Inclusive","true","Double Room"`;

    const filePath = join(testDataDir, "offers_invalid_dates.csv");
    await fs.writeFile(filePath, csvContent);

    const offers: Offer[] = [];
    const result = await OfferCsvParser.parseOffers(filePath, async (batch) => {
      offers.push(...batch);
    });

    expect(offers).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });

  it("should handle boolean values correctly", async () => {
    const csvContent = `"hotelid","price","countadults","countchildren","departuredate","returndate","outbounddepartureairport","inbounddepartureairport","outboundarrivalairport","inboundarrivalairport","mealtype","oceanview","roomtype"
"1","1000","2","0","2024-06-01 10:00","2024-06-08 14:00","FRA","PMI","PMI","FRA","All Inclusive","true","Double Room"
"2","1100","2","0","2024-06-02 10:00","2024-06-09 14:00","FRA","PMI","PMI","FRA","All Inclusive","true","Double Room"
"3","1200","2","0","2024-06-03 10:00","2024-06-10 14:00","FRA","PMI","PMI","FRA","All Inclusive","false","Double Room"
"4","1300","2","0","2024-06-04 10:00","2024-06-11 14:00","FRA","PMI","PMI","FRA","All Inclusive","false","Double Room"
"5","1400","2","0","2024-06-05 10:00","2024-06-12 14:00","FRA","PMI","PMI","FRA","All Inclusive","true","Double Room"
"6","1500","2","0","2024-06-06 10:00","2024-06-13 14:00","FRA","PMI","PMI","FRA","All Inclusive","false","Double Room"`;

    const filePath = join(testDataDir, "offers_boolean_test.csv");
    await fs.writeFile(filePath, csvContent);

    const offers: Offer[] = [];
    const result = await OfferCsvParser.parseOffers(filePath, async (batch) => {
      offers.push(...batch);
    });

    expect(offers).toHaveLength(6);
    expect(offers[0]!.oceanView).toBe(true);
    expect(offers[1]!.oceanView).toBe(true);
    expect(offers[2]!.oceanView).toBe(false);
    expect(offers[3]!.oceanView).toBe(false);
    expect(offers[4]!.oceanView).toBe(true);
    expect(offers[5]!.oceanView).toBe(false);
  });

  it("should handle empty files", async () => {
    const csvContent = `"hotelid","price","countadults","countchildren","departuredate","returndate","outbounddepartureairport","inbounddepartureairport","outboundarrivalairport","inboundarrivalairport","mealtype","oceanview","roomtype"`;

    const filePath = join(testDataDir, "offers_empty.csv");
    await fs.writeFile(filePath, csvContent);

    const offers: Offer[] = [];
    const result = await OfferCsvParser.parseOffers(filePath, async (batch) => {
      offers.push(...batch);
    });

    expect(offers).toHaveLength(0);
    expect(result.totalRows).toBe(0);
    expect(result.validRows).toBe(0);
  });

  it("should parse date fields correctly", async () => {
    const csvContent = `"hotelid","price","countadults","countchildren","departuredate","returndate","outbounddepartureairport","inbounddepartureairport","outboundarrivalairport","inboundarrivalairport","mealtype","oceanview","roomtype"
"1","1200.50","2","0","2024-06-01 10:00","2024-06-08 14:00","FRA","PMI","PMI","FRA","All Inclusive","true","Double Room"
"2","900.00","1","1","2024-06-15 08:00","2024-06-22 12:00","MUC","PMI","PMI","MUC","Half Board","false","Family Room"`;

    const filePath = join(testDataDir, "offers_date_test.csv");
    await fs.writeFile(filePath, csvContent);

    const offers: Offer[] = [];
    const result = await OfferCsvParser.parseOffers(filePath, async (batch) => {
      offers.push(...batch);
    });

    expect(offers).toHaveLength(2);
    expect(offers[0]!.outboundDepartureDateTime.getFullYear()).toBe(2024);
    expect(offers[0]!.outboundDepartureDateTime.getMonth()).toBe(5); // June
    expect(offers[1]!.outboundDepartureDateTime.getFullYear()).toBe(2024);
    expect(offers[1]!.outboundDepartureDateTime.getMonth()).toBe(5); // June
  });

  it("should reject malformed CSV files", async () => {
    const csvContent = `malformed content without proper structure`;

    const filePath = join(testDataDir, "offers_malformed.csv");
    await fs.writeFile(filePath, csvContent);

    const offers: Offer[] = [];
    const result = await OfferCsvParser.parseOffers(filePath, async (batch) => {
      offers.push(...batch);
    });

    expect(offers).toHaveLength(0);
  });

  it("should handle files with missing headers", async () => {
    const csvContent = `1,1200.50,2,0,2024-06-01 10:00,2024-06-08 14:00,FRA,PMI,PMI,FRA,All Inclusive,true,Double Room`;

    const filePath = join(testDataDir, "offers_no_headers.csv");
    await fs.writeFile(filePath, csvContent);

    const offers: Offer[] = [];

    // This should fail gracefully when no headers are present
    await expect(
      OfferCsvParser.parseOffers(filePath, async (batch) => {
        offers.push(...batch);
      }),
    ).rejects.toThrow();
  });

  it("should handle quoted fields with special characters", async () => {
    const csvContent = `"hotelid","price","countadults","countchildren","departuredate","returndate","outbounddepartureairport","inbounddepartureairport","outboundarrivalairport","inboundarrivalairport","mealtype","oceanview","roomtype"
"1","1200.50","2","0","2024-06-01 10:00","2024-06-08 14:00","FRA","PMI","PMI","FRA","All Inclusive","true","Double Room"`;

    const filePath = join(testDataDir, "offers_quoted_fields.csv");
    await fs.writeFile(filePath, csvContent);

    const offers: Offer[] = [];
    const result = await OfferCsvParser.parseOffers(filePath, async (batch) => {
      offers.push(...batch);
    });

    expect(offers).toHaveLength(1);
    expect(offers[0]!.outboundDepartureAirport).toBe("FRA");
    expect(offers[0]!.inboundDepartureAirport).toBe("PMI");
    expect(offers[0]!.outboundArrivalAirport).toBe("PMI");
    expect(offers[0]!.inboundArrivalAirport).toBe("FRA");
  });
});

describe("CsvParser", () => {
  beforeAll(async () => {
    // Create test data directory
    await fs.mkdir(testDataDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test data directory
    try {
      await fs.rm(testDataDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it("should parse custom CSV with different delimiter", async () => {
    const csvContent = `col1,col2,col3
value1,value2,value3
value4,value5,value6`;

    const filePath = join(testDataDir, "custom.csv");
    await fs.writeFile(filePath, csvContent);

    type TestRow = { col1: string; col2: string; col3: string };
    const data: TestRow[] = [];

    const result = await CsvParser.parseFile<TestRow>(
      filePath,
      (row) => ({
        col1: row.col1 || "",
        col2: row.col2 || "",
        col3: row.col3 || "",
      }),
      async (batch) => {
        data.push(...batch);
      },
      { delimiter: ",", skipHeader: true },
    );

    expect(data).toHaveLength(2);
    expect(data[0]).toEqual({ col1: "value1", col2: "value2", col3: "value3" });
    expect(data[1]).toEqual({ col1: "value4", col2: "value5", col3: "value6" });
    expect(result.validRows).toBe(2);
    expect(result.totalRows).toBe(2);
  });

  it("should handle batch processing correctly", async () => {
    const csvContent = `col1;col2
row1;data1
row2;data2
row3;data3
row4;data4
row5;data5
row6;data6
row7;data7
row8;data8
row9;data9
row10;data10`;

    const filePath = join(testDataDir, "batch_test.csv");
    await fs.writeFile(filePath, csvContent);

    type TestRow = { col1: string; col2: string };
    const data: TestRow[] = [];

    const result = await CsvParser.parseFile<TestRow>(
      filePath,
      (row) => ({
        col1: row.col1 || "",
        col2: row.col2 || "",
      }),
      async (batch) => {
        data.push(...batch);
      },
      { delimiter: ";", skipHeader: true, batchSize: 3 },
    );

    expect(data).toHaveLength(10);
    expect(result.validRows).toBe(10);
  });

  it("should handle parsing errors correctly", async () => {
    const csvContent = `col1;col2
valid;data
invalid;`;

    const filePath = join(testDataDir, "error_test.csv");
    await fs.writeFile(filePath, csvContent);

    const data: { value: string }[] = [];

    const result = await CsvParser.parseFile<{ value: string }>(
      filePath,
      (row) => {
        if (!row.col1 || row.col1.trim() === "") {
          throw new Error("Missing col1");
        }
        return { value: row.col1 };
      },
      async (batch) => {
        data.push(...batch);
      },
      { delimiter: ";" },
    );

    expect(data).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.validRows).toBe(2);
    expect(result.totalRows).toBe(2);
  });

  it("should handle custom row parser with validation", async () => {
    const csvContent = `value
123
456
invalid
789`;

    const filePath = join(testDataDir, "validation_test.csv");
    await fs.writeFile(filePath, csvContent);

    const data: { value: string }[] = [];

    const result = await CsvParser.parseFile<{ value: string }>(
      filePath,
      (row) => {
        if (!row.value || isNaN(Number(row.value))) {
          throw new Error("Invalid number");
        }
        return { value: row.value };
      },
      async (batch) => {
        data.push(...batch);
      },
    );

    expect(data).toHaveLength(3);
    expect(result.errors).toHaveLength(1);
    expect(result.validRows).toBe(3);
    expect(result.totalRows).toBe(4);
  });
});
