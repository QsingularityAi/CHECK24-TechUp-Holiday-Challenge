import React from 'react';
import { Box, Typography, Container, Stack } from '@mui/material';
import { Flight, Hotel, BeachAccess } from '@mui/icons-material';

export default function HeroSection() {
    return (
        <Box
            sx={{
                backgroundImage: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url("/mallorca_spain.jpg")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                minHeight: { xs: '50vh', sm: '55vh', md: '60vh' },
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                    animation: 'float 20s ease-in-out infinite',
                },
                '@keyframes float': {
                    '0%, 100%': {
                        transform: 'translateY(0px)',
                    },
                    '50%': {
                        transform: 'translateY(-20px)',
                    },
                },
            }}
        >
            <Container maxWidth="xl" sx={{ 
                position: 'relative', 
                zIndex: 1,
                px: { xs: 2, sm: 3, md: 4 }
            }}>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={{ xs: 3, sm: 4, md: 4 }}
                    alignItems="center"
                    justifyContent="space-between"
                >
                    <Box sx={{ 
                        flex: 1, 
                        textAlign: { xs: 'center', md: 'left' },
                        px: { xs: 1, sm: 2, md: 0 }
                    }}>
                        <Typography
                            variant="h1"
                            sx={{
                                color: 'white',
                                fontWeight: 800,
                                fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem', lg: '4rem' },
                                lineHeight: 1.1,
                                mb: { xs: 1.5, sm: 2 },
                                textShadow: '0 4px 8px rgba(0,0,0,0.3)',
                            }}
                        >
                            Discover Your
                            <br />
                            <Box component="span" sx={{ color: 'var(--accent-orange)' }}>
                                Perfect Holiday
                            </Box>
                        </Typography>
                        <Typography
                            variant="h5"
                            sx={{
                                color: 'rgba(255,255,255,0.9)',
                                fontWeight: 400,
                                fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' },
                                mb: { xs: 3, sm: 4 },
                                maxWidth: '500px',
                                mx: { xs: 'auto', md: 0 },
                                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            }}
                        >
                            Find amazing deals on flights and hotels for your dream vacation.
                            Start your journey with us today.
                        </Typography>
                        
                        {/* Feature Icons */}
                        <Stack
                            direction="row"
                            spacing={{ xs: 2, sm: 3, md: 4 }}
                            justifyContent={{ xs: 'center', md: 'flex-start' }}
                            sx={{ mt: { xs: 3, sm: 4 } }}
                        >
                            <Box sx={{ textAlign: 'center' }}>
                                <Flight
                                    sx={{
                                        fontSize: { xs: '2rem', sm: '2.25rem', md: '2.5rem' },
                                        color: 'white',
                                        mb: { xs: 0.5, sm: 1 },
                                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                                    }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{ 
                                        color: 'rgba(255,255,255,0.8)', 
                                        fontWeight: 500,
                                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                    }}
                                >
                                    Flights
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                                <Hotel
                                    sx={{
                                        fontSize: { xs: '2rem', sm: '2.25rem', md: '2.5rem' },
                                        color: 'white',
                                        mb: { xs: 0.5, sm: 1 },
                                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                                    }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{ 
                                        color: 'rgba(255,255,255,0.8)', 
                                        fontWeight: 500,
                                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                    }}
                                >
                                    Hotels
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                                <BeachAccess
                                    sx={{
                                        fontSize: { xs: '2rem', sm: '2.25rem', md: '2.5rem' },
                                        color: 'white',
                                        mb: { xs: 0.5, sm: 1 },
                                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                                    }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{ 
                                        color: 'rgba(255,255,255,0.8)', 
                                        fontWeight: 500,
                                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                    }}
                                >
                                    Vacation
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>
                    
                    {/* Decorative Elements */}
                    <Box
                        sx={{
                            flex: 1,
                            display: { xs: 'none', md: 'flex' },
                            justifyContent: 'center',
                            alignItems: 'center',
                            position: 'relative',
                        }}
                    >
                        <Box
                            sx={{
                                width: { xs: '200px', sm: '250px', md: '300px' },
                                height: { xs: '200px', sm: '250px', md: '300px' },
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                animation: 'pulse 3s ease-in-out infinite',
                                '@keyframes pulse': {
                                    '0%, 100%': {
                                        transform: 'scale(1)',
                                        opacity: 0.8,
                                    },
                                    '50%': {
                                        transform: 'scale(1.05)',
                                        opacity: 1,
                                    },
                                },
                            }}
                        >
                            <Typography
                                variant="h3"
                                sx={{
                                    color: 'white',
                                    fontWeight: 700,
                                    textAlign: 'center',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                }}
                            >
                                ✈️
                                <br />
                                🏨
                                <br />
                                🏖️
                            </Typography>
                        </Box>
                    </Box>
                </Stack>
            </Container>
        </Box>
    );
}