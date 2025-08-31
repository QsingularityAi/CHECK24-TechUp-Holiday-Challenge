import {Paths} from "@/app/types/openapi";
import {ReadonlyURLSearchParams} from "next/navigation";

export function GetBestOffersByHotelToQuery(input: Paths.GetBestOffersByHotel.QueryParameters): string {
    const params: Record<string, string> = {};
    
    // Only add parameters that have valid values
    if (input.earliestDepartureDate && input.earliestDepartureDate !== 'undefined') {
        params.earliestDepartureDate = input.earliestDepartureDate;
    }
    if (input.latestReturnDate && input.latestReturnDate !== 'undefined') {
        params.latestReturnDate = input.latestReturnDate;
    }
    if (input.duration !== undefined && input.duration !== null) {
        params.duration = input.duration.toString();
    }
    if (input.countAdults !== undefined && input.countAdults !== null) {
        params.countAdults = input.countAdults.toString();
    }
    if (input.countChildren !== undefined && input.countChildren !== null) {
        params.countChildren = input.countChildren.toString();
    }

    const searchParams = new URLSearchParams(params);
    
    // cant pass an object with an array to URLSearchParams --> append individually
    if (input.departureAirports && Array.isArray(input.departureAirports)) {
        input.departureAirports.forEach((airport) => {
            if (airport && airport.trim()) {
                searchParams.append("departureAirports", airport);
            }
        });
    }

    return searchParams.toString();
}

export function GetBestOffersByHotelFromQuery(query: ReadonlyURLSearchParams): Paths.GetBestOffersByHotel.QueryParameters {
    return {
        earliestDepartureDate: query.get("earliestDepartureDate") as string,
        latestReturnDate: query.get("latestReturnDate") as string,
        countAdults: parseInt(query.get("countAdults") as string),
        countChildren: parseInt(query.get("countChildren") as string),
        departureAirports: query.getAll("departureAirports"),
        duration: parseInt(query.get("duration") as string),
    };
}

export function GetHotelOffersToQuery(input: Paths.GetHotelOffers.QueryParameters): string {
    const params: Record<string, string> = {};
    
    // Only add parameters that have valid values
    if (input.earliestDepartureDate && input.earliestDepartureDate !== 'undefined') {
        params.earliestDepartureDate = input.earliestDepartureDate;
    }
    if (input.latestReturnDate && input.latestReturnDate !== 'undefined') {
        params.latestReturnDate = input.latestReturnDate;
    }
    if (input.duration !== undefined && input.duration !== null) {
        params.duration = input.duration.toString();
    }
    if (input.countAdults !== undefined && input.countAdults !== null) {
        params.countAdults = input.countAdults.toString();
    }
    if (input.countChildren !== undefined && input.countChildren !== null) {
        params.countChildren = input.countChildren.toString();
    }

    const searchParams = new URLSearchParams(params);
    
    // cant pass an object with an array to URLSearchParams --> append individually
    if (input.departureAirports && Array.isArray(input.departureAirports)) {
        input.departureAirports.forEach((airport) => {
            if (airport && airport.trim()) {
                searchParams.append("departureAirports", airport);
            }
        });
    }

    return searchParams.toString();
}

export function GetHotelOffersFromQuery(query: ReadonlyURLSearchParams): Paths.GetHotelOffers.QueryParameters & Paths.GetHotelOffers.PathParameters {
    return {
        earliestDepartureDate: query.get("earliestDepartureDate") as string,
        latestReturnDate: query.get("latestReturnDate") as string,
        countAdults: parseInt(query.get("countAdults") as string),
        countChildren: parseInt(query.get("countChildren") as string),
        departureAirports: query.getAll("departureAirports"),
        duration: parseInt(query.get("duration") as string),
        hotelId: parseInt(query.get("hotelId") as string),
    }
}