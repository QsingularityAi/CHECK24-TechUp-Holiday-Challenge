"use client";

import SearchForm from "@/app/components/SearchForm/SearchForm";
import { Stack, Typography, Container, Box, Fade, Grow, CircularProgress } from "@mui/material";
import Hotel from "@/app/components/Hotel/Hotel";
import { Components, Paths } from "@/app/types/openapi";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import HeroSection from "@/app/components/HeroSection/HeroSection";
import LoadingSkeleton from "@/app/components/LoadingSkeleton/LoadingSkeleton";
type BestHotelOffer = Components.Schemas.BestHotelOffer;
import { GetBestOffersByHotelFromQuery, GetBestOffersByHotelToQuery } from "@/app/types/converter";

export default function HomePage() {
    const [offers, setOffers] = useState<BestHotelOffer[]>([]);
    const [queryParameters, setQueryParameters] = useState<Paths.GetBestOffersByHotel.QueryParameters>();
    const [loading, setLoading] = useState(false);
    const [searchPerformed, setSearchPerformed] = useState(false);
    const router = useRouter();
    const query = useSearchParams();

    // update the search form and automatically load offers if a search is existing
    useEffect(() => {
        const parameters = GetBestOffersByHotelFromQuery(query);
        // Validate parameters before loading offers
        if (!parameters.earliestDepartureDate || !parameters.departureAirports || parameters.departureAirports.length === 0 || !parameters.countAdults || !parameters.duration) {
            return;
        }
        load(parameters).catch(console.error);
    }, []);


    async function onSubmitSearchForm(
        departureAirports: string[], 
        countAdults: number, 
        countChildren: number, 
        duration: number, 
        earliestDeparture: string | undefined, 
        latestReturn: string | undefined,
        // Advanced filters (currently not used by API but accepted to prevent errors)
        mealTypes?: string[],
        roomTypes?: string[],
        oceanView?: boolean,
        minPrice?: number,
        maxPrice?: number,
        hotelStars?: number[]
    ) {
        const parameters: Paths.GetBestOffersByHotel.QueryParameters = {
            earliestDepartureDate: earliestDeparture || "",
            latestReturnDate: latestReturn || "",
            countAdults: countAdults,
            countChildren: countChildren,
            departureAirports: departureAirports,
            duration: duration,
        };

        setSearchPerformed(true);
        await load(parameters);
    }

    async function load(parameters: Paths.GetBestOffersByHotel.QueryParameters) {
        try {
            setLoading(true);
            setOffers([]);
            setQueryParameters(parameters);
            router.push("/?" + GetBestOffersByHotelToQuery(parameters));
            
            // Connect directly to our backend API
            console.log('Making API call to:', `http://localhost:3000/api/bestOffersByHotel?${GetBestOffersByHotelToQuery(parameters)}`);
            const response = await fetch(`http://localhost:3000/api/bestOffersByHotel?${GetBestOffersByHotelToQuery(parameters)}`);

            if (!response.ok) {
                console.error('API response not ok:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Error response body:', errorText);
                setOffers([]);
                return;
            }

            const data = await response.json();
            console.log('API response data:', data);

            // Simulate a minimum loading time for better UX
            await new Promise(resolve => setTimeout(resolve, 800));

            // Ensure data is an array
            if (Array.isArray(data)) {
                setOffers(data);
            } else {
                console.error('API returned non-array data:', data);
                setOffers([]);
            }
        } catch (error) {
            console.error('Error loading offers:', error);
            setOffers([]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <HeroSection />
            
            <Container 
                maxWidth="xl" 
                sx={{ 
                    py: { xs: 2, sm: 4, md: 6 },
                    px: { xs: 1, sm: 2, md: 3 }
                }}
            >
                <Fade in timeout={600}>
                    <Box sx={{ mb: { xs: 4, sm: 6, md: 8 } }}>
                        <SearchForm submitCallback={onSubmitSearchForm} />
                    </Box>
                </Fade>
                
                {/* Loading State */}
                {loading && searchPerformed && (
                    <Fade in timeout={400}>
                        <Box>
                            <Typography 
                                variant="h4" 
                                sx={{ 
                                    mb: { xs: 3, sm: 4, md: 6 },
                                    fontWeight: 700,
                                    color: 'var(--text-primary)',
                                    textAlign: 'center',
                                    fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' }
                                }}
                            >
                                Searching Hotels...
                            </Typography>
                            <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                mb: 4 
                            }}>
                                <CircularProgress 
                                    size={40} 
                                    sx={{ 
                                        color: 'var(--primary-color)',
                                        '& .MuiCircularProgress-circle': {
                                            strokeLinecap: 'round',
                                        }
                                    }} 
                                />
                            </Box>
                            <Stack 
                                gap={{ xs: 2, sm: 3, md: 4 }}
                                sx={{
                                    maxWidth: '1200px',
                                    mx: 'auto'
                                }}
                            >
                                {[...Array(3)].map((_, index) => (
                                    <LoadingSkeleton key={index} variant="hotel" />
                                ))}
                            </Stack>
                        </Box>
                    </Fade>
                )}
                
                {/* Results */}
                {!loading && offers.length > 0 && (
                    <Grow in timeout={800}>
                        <Box>
                            <Typography 
                                variant="h4" 
                                sx={{ 
                                    mb: { xs: 3, sm: 4, md: 6 },
                                    fontWeight: 700,
                                    color: 'var(--text-primary)',
                                    textAlign: 'center',
                                    fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' }
                                }}
                            >
                                Hotels for your Mallorca-Trip
                            </Typography>
                            <Stack 
                                gap={{ xs: 2, sm: 3, md: 4 }}
                                sx={{
                                    maxWidth: '1200px',
                                    mx: 'auto'
                                }}
                            >
                                {offers.map((offer, index) =>
                                    <Fade 
                                        key={offer.hotel.id}
                                        in 
                                        timeout={600}
                                        style={{ transitionDelay: `${index * 100}ms` }}
                                    >
                                        <div>
                                            <Link 
                                                href={{ pathname: '/offers', query: { ...queryParameters, hotelId: offer.hotel.id } }}
                                                style={{ 
                                                    textDecoration: "none",
                                                    display: 'block',
                                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                <Hotel offer={offer} />
                                            </Link>
                                        </div>
                                    </Fade>
                                )}
                            </Stack>
                        </Box>
                    </Grow>
                )}
                
                {/* No Results */}
                {!loading && offers.length === 0 && searchPerformed && (
                    <Fade in timeout={600}>
                        <Box sx={{ 
                            textAlign: 'center', 
                            py: { xs: 6, sm: 8, md: 12 },
                            px: { xs: 2, sm: 4 }
                        }}>
                            <Typography 
                                variant="h6" 
                                sx={{ 
                                    color: 'var(--text-secondary)',
                                    mb: 2,
                                    fontSize: { xs: '1.1rem', sm: '1.25rem' }
                                }}
                            >
                                No hotels found for your search criteria
                            </Typography>
                            <Typography 
                                variant="body1" 
                                sx={{ 
                                    color: 'var(--text-secondary)',
                                    fontSize: { xs: '0.9rem', sm: '1rem' }
                                }}
                            >
                                Try adjusting your search parameters or dates
                            </Typography>
                        </Box>
                    </Fade>
                )}
            </Container>
        </>
    )
}