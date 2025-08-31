"use client";

import {Components} from "@/app/types/openapi"
import HotelOfferComponent from "@/app/components/HotelOffer/HotelOffer";
import {useSearchParams} from 'next/navigation';
import {useEffect, useState} from "react";
import {Box, Typography, Container, Paper, Chip, IconButton, CircularProgress, Breadcrumbs, Link, Fade, Grow} from "@mui/material";
import {Stack} from "@mui/system";
import {GetHotelOffersFromQuery, GetHotelOffersToQuery} from "@/app/types/converter";
import {Star, Share, Favorite} from "@mui/icons-material";
import LoadingSkeleton from "@/app/components/LoadingSkeleton/LoadingSkeleton";
import {useRouter} from 'next/navigation';

type HotelOffer = Components.Schemas.GetHotelOffersResponse

export default function Page() {
    const query = useSearchParams()
    const router = useRouter()
    const [hotelOffer, setHotelOffer] = useState<HotelOffer>();
    const [loading, setLoading] = useState(true);

    async function fetchData() {
        try {
            setLoading(true);
            const parameters = GetHotelOffersFromQuery(query);
            console.log(parameters);
            // Connect directly to our backend API
            const response = await fetch(`http://localhost:3000/api/hotels/${parameters.hotelId}/offers?${GetHotelOffersToQuery(parameters)}`);
            const data = await response.json();
            setHotelOffer(data);
        } catch (error) {
            console.error('Error fetching hotel offers:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData().catch(console.error);
    }, []);

    if (loading) {
        return (
            <Container 
                maxWidth="xl" 
                sx={{ 
                    py: { xs: 4, sm: 6, md: 8 },
                    px: { xs: 1, sm: 2, md: 3 }
                }}
            >
                <Fade in timeout={400}>
                    <Box>
                        {/* Loading Header */}
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            minHeight: { xs: '20vh', sm: '25vh' },
                            mb: 4
                        }}>
                            <Box sx={{ textAlign: 'center' }}>
                                <CircularProgress 
                                    size={60} 
                                    sx={{ 
                                        color: 'var(--primary-600)', 
                                        mb: 2,
                                        '& .MuiCircularProgress-circle': {
                                            strokeLinecap: 'round',
                                        }
                                    }} 
                                />
                                <Typography 
                                    variant="h6" 
                                    sx={{ 
                                        color: 'var(--text-secondary)',
                                        fontSize: { xs: '1rem', sm: '1.25rem' }
                                    }}
                                >
                                    Loading hotel offers...
                                </Typography>
                            </Box>
                        </Box>
                        
                        {/* Loading Skeletons */}
                        <Stack 
                            gap={{ xs: 2, sm: 3, md: 4 }}
                            sx={{
                                maxWidth: '1200px',
                                mx: 'auto'
                            }}
                        >
                            <LoadingSkeleton variant="hotel" />
                             {[...Array(3)].map((_, index) => (
                                 <LoadingSkeleton key={index} variant="offer" />
                             ))}
                        </Stack>
                    </Box>
                </Fade>
            </Container>
        )
    }

    if (!hotelOffer) {
        return (
            <Container 
                maxWidth="xl" 
                sx={{ 
                    py: { xs: 6, sm: 8, md: 12 }, 
                    textAlign: 'center',
                    px: { xs: 1, sm: 2, md: 3 }
                }}
            >
                <Typography 
                    variant="h5" 
                    sx={{ 
                        color: 'var(--text-secondary)',
                        fontSize: { xs: '1.25rem', sm: '1.5rem' }
                    }}
                >
                    No offers found for this hotel.
                </Typography>
            </Container>
        )
    }

    return (
        <Fade in timeout={600}>
            <Container 
                maxWidth="xl" 
                sx={{ 
                    py: { xs: 2, sm: 4, md: 6 },
                    px: { xs: 1, sm: 2, md: 3 }
                }}
            >
            {/* Breadcrumbs */}
            <Breadcrumbs 
                sx={{ 
                    mb: { xs: 2, sm: 3 }, 
                    color: 'var(--text-secondary)',
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                }}
                separator="›"
            >
                <Link 
                    component="button" 
                    variant="body2" 
                    onClick={() => router.back()}
                    sx={{ 
                        color: 'var(--primary-600)', 
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                >
                    Search Results
                </Link>
                <Typography 
                    variant="body2" 
                    sx={{ 
                        color: 'var(--text-primary)',
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                >
                    {hotelOffer.hotel.name}
                </Typography>
            </Breadcrumbs>

            {/* Hotel Header */}
            <Grow in timeout={800}>
                <Paper
                    elevation={0}
                    sx={{
                        background: 'var(--gradient-card)',
                        borderRadius: 'var(--border-radius-lg)',
                        overflow: 'hidden',
                        mb: { xs: 3, sm: 4, md: 6 },
                        border: '1px solid rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(20px)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                        }
                    }}
                >
                {/* Hero Images */}
                <Box sx={{ position: 'relative', height: { xs: '200px', sm: '250px', md: '300px' }, overflow: 'hidden' }}>
                    <Stack direction="row" sx={{ height: '100%' }}>
                        <Box 
                            sx={{
                                backgroundImage: `linear-gradient(45deg, rgba(0,0,0,0.2), rgba(0,0,0,0.4)), url("/hotels/${(hotelOffer.hotel.id % 40) + 1}.jpg")`,
                                width: "50%", 
                                backgroundSize: "cover", 
                                backgroundPosition: "center",
                                transition: 'transform 0.3s ease',
                                '&:hover': { transform: 'scale(1.02)' }
                            }}
                        />
                        <Box 
                            sx={{
                                backgroundImage: `linear-gradient(45deg, rgba(0,0,0,0.2), rgba(0,0,0,0.4)), url("/rooms/${(hotelOffer.hotel.id % 30) + 1}.jpg")`,
                                width: "50%", 
                                backgroundSize: "cover", 
                                backgroundPosition: "center",
                                transition: 'transform 0.3s ease',
                                '&:hover': { transform: 'scale(1.02)' }
                            }}
                        />
                    </Stack>
                    
                    {/* Action Buttons */}
                    <Box sx={{ position: 'absolute', top: { xs: 12, sm: 16 }, right: { xs: 12, sm: 16 }, display: 'flex', gap: 1 }}>
                        <IconButton
                            size={typeof window !== 'undefined' && window.innerWidth < 600 ? 'small' : 'medium'}
                            sx={{
                                backgroundColor: 'rgba(255,255,255,0.9)',
                                backdropFilter: 'blur(10px)',
                                '&:hover': { backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)' }
                            }}
                        >
                            <Share sx={{ fontSize: { xs: 18, sm: 24 } }} />
                        </IconButton>
                        <IconButton
                            size={typeof window !== 'undefined' && window.innerWidth < 600 ? 'small' : 'medium'}
                            sx={{
                                backgroundColor: 'rgba(255,255,255,0.9)',
                                backdropFilter: 'blur(10px)',
                                '&:hover': { backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)' }
                            }}
                        >
                            <Favorite sx={{ fontSize: { xs: 18, sm: 24 } }} />
                        </IconButton>
                    </Box>
                </Box>

                {/* Hotel Info */}
                <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                    <Stack 
                        direction={{ xs: 'column', sm: 'row' }} 
                        justifyContent="space-between" 
                        alignItems={{ xs: 'flex-start', sm: 'flex-start' }} 
                        sx={{ mb: 2, gap: { xs: 2, sm: 0 } }}
                    >
                        <Box>
                            <Typography 
                                variant="h3" 
                                sx={{
                                    fontWeight: 800,
                                    color: 'var(--text-primary)',
                                    mb: 1,
                                    fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' }
                                }}
                            >
                                {hotelOffer.hotel.name}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {[...Array(5)].map((_, index) => (
                                        <Star 
                                            key={index}
                                            sx={{ 
                                                color: index < hotelOffer.hotel.stars ? '#FFD700' : 'var(--border-light)',
                                                fontSize: { xs: 16, sm: 20 }
                                            }} 
                                        />
                                    ))}
                                </Box>
                                <Typography 
                                    variant="body1" 
                                    sx={{ 
                                        color: 'var(--text-secondary)', 
                                        ml: 1,
                                        fontSize: { xs: '0.875rem', sm: '1rem' }
                                    }}
                                >
                                    {hotelOffer.hotel.stars} Star Hotel
                                </Typography>
                            </Box>
                        </Box>
                        
                        <Chip 
                            label={`${hotelOffer.items.length} Available Offers`}
                            size={typeof window !== 'undefined' && window.innerWidth < 600 ? 'small' : 'medium'}
                            sx={{
                                backgroundColor: 'var(--primary-100)',
                                color: 'var(--primary-700)',
                                fontWeight: 600,
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}
                        />
                    </Stack>
                </Box>
                </Paper>
            </Grow>

            {/* Offers Section */}
            <Box sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
                <Typography 
                    variant="h4" 
                    sx={{
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        mb: 1,
                        fontSize: { xs: '1.25rem', sm: '1.5rem' },
                        textAlign: { xs: 'center', sm: 'left' }
                    }}
                >
                    Available Offers
                </Typography>
                <Typography 
                    variant="body1" 
                    sx={{ 
                        color: 'var(--text-secondary)',
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        textAlign: { xs: 'center', sm: 'left' }
                    }}
                >
                    Choose from {hotelOffer.items.length} available booking options
                </Typography>
            </Box>
            
            <Stack 
                gap={{ xs: 2, sm: 3, md: 4 }}
                sx={{
                    maxWidth: '1200px',
                    mx: 'auto'
                }}
            >
                {hotelOffer.items.map((offer, index) =>
                    <Fade 
                        key={`${offer.price}-${index}`}
                        in 
                        timeout={600}
                        style={{ transitionDelay: `${index * 150}ms` }}
                    >
                        <div>
                            <HotelOfferComponent offer={offer}/>
                        </div>
                    </Fade>
                )}
            </Stack>
            </Container>
        </Fade>
    )
}