import React, { useState } from 'react';
import {Box, Button, Card, CardContent, Chip, Stack, Typography, IconButton, Zoom, Tooltip} from "@mui/material";
import {People, CalendarToday, Star, Visibility, FavoriteOutlined, Favorite} from "@mui/icons-material";
import {Components} from "@/app/types/openapi";
type BestHotelOffer = Components.Schemas.BestHotelOffer;

interface Properties {
    offer: BestHotelOffer
}

export default function Hotel({offer}: Properties) {
    const [isFavorite, setIsFavorite] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    
    return (
        <Card 
            elevation={0}
            sx={{
                display: 'flex',
                borderRadius: 'var(--border-radius-lg)',
                overflow: 'hidden',
                background: 'var(--gradient-card)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(20px)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                '&:hover': {
                    transform: 'translateY(-4px) scale(1.02)',
                    boxShadow: 'var(--shadow-xl)',
                    '& .hotel-image': {
                        transform: 'scale(1.1)'
                    },
                    '& .hotel-favorite': {
                        transform: 'scale(1.1)',
                    },
                    '& .hotel-price': {
                        background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--secondary-600) 100%)',
                        transform: 'scale(1.05)',
                    }
                },
                minHeight: '240px',
                position: 'relative'
            }}
        >
            {/* Image Section */}
            <Box 
                sx={{
                    position: 'relative',
                    width: '320px',
                    minWidth: '320px',
                    height: '240px',
                    overflow: 'hidden'
                }}
            >
                {/* Hidden img element to handle loading */}
                <img 
                    src={`/hotels/${(offer.hotel.id % 40) + 1}.jpg`}
                    alt={offer.hotel.name}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageLoaded(true)} // Show even if image fails to load
                    style={{ display: 'none' }}
                />
                
                <Box 
                    className="hotel-image"
                    sx={{
                        backgroundImage: `linear-gradient(45deg, rgba(0,0,0,0.1), rgba(0,0,0,0.3)), url("/hotels/${(offer.hotel.id % 40) + 1}.jpg")`,
                        width: '100%',
                        height: '100%',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                        opacity: imageLoaded ? 1 : 0,
                    }}
                />
                
                {/* Loading shimmer effect */}
                {!imageLoaded && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite',
                            '@keyframes shimmer': {
                                '0%': {
                                    backgroundPosition: '-200% 0',
                                },
                                '100%': {
                                    backgroundPosition: '200% 0',
                                },
                            },
                        }}
                    />
                )}
                
                {/* Favorite Button */}
                <Tooltip title={isFavorite ? "Remove from favorites" : "Add to favorites"} arrow>
                    <IconButton
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsFavorite(!isFavorite);
                        }}
                        className="hotel-favorite"
                        sx={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            backdropFilter: 'blur(10px)',
                            width: 40,
                            height: 40,
                            color: isFavorite ? 'var(--accent-color)' : 'var(--text-secondary)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 1)',
                                transform: 'scale(1.15)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            }
                        }}
                    >
                        <Zoom in={true} style={{ transitionDelay: isFavorite ? '0ms' : '100ms' }}>
                            {isFavorite ? <Favorite sx={{ fontSize: 20 }} /> : <FavoriteOutlined sx={{ fontSize: 20 }} />}
                        </Zoom>
                    </IconButton>
                </Tooltip>
                
                {/* Star Rating Badge */}
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 12,
                        left: 12,
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 'var(--border-radius-md)',
                        px: 1.5,
                        py: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                    }}
                >
                    <Star sx={{ color: '#FFD700', fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {offer.hotel.stars}
                    </Typography>
                </Box>
            </Box>

            {/* Content Section */}
            <CardContent 
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    p: 3,
                    '&:last-child': { pb: 3 }
                }}
            >
                {/* Header */}
                <Box>
                    <Typography 
                        variant="h5" 
                        sx={{
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            mb: 1,
                            fontSize: '1.25rem',
                            lineHeight: 1.3
                        }}
                    >
                        {offer.hotel.name}
                    </Typography>
                    
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <Chip 
                            label="Halfboard" 
                            size="small"
                            sx={{
                                backgroundColor: 'var(--primary-100)',
                                color: 'var(--primary-700)',
                                fontWeight: 600,
                                fontSize: '0.75rem'
                            }}
                        />
                        <Chip 
                            label="Apartment" 
                            size="small"
                            sx={{
                                backgroundColor: 'var(--secondary-100)',
                                color: 'var(--secondary-700)',
                                fontWeight: 600,
                                fontSize: '0.75rem'
                            }}
                        />
                    </Stack>
                </Box>

                {/* Details */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Stack spacing={1.5}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarToday sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
                            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                                {offer.duration} Days
                            </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <People sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
                            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                                {offer.countAdults} Adults{offer.countChildren > 0 && `, ${offer.countChildren} Children`}
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

                {/* Footer */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 2 }}>
                    <Box>
                        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 0.5 }}>
                            Starting from
                        </Typography>
                        <Typography 
                            variant="h4" 
                            className="hotel-price"
                            sx={{
                                fontWeight: 800,
                                color: 'var(--primary-600)',
                                fontSize: '1.75rem',
                                lineHeight: 1,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                        >
                            €{offer.minPrice}
                        </Typography>
                    </Box>
                    
                    <Button 
                        variant="contained"
                        startIcon={<Visibility />}
                        sx={{
                            background: 'var(--gradient-primary)',
                            borderRadius: 'var(--border-radius-md)',
                            px: 3,
                            py: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            fontSize: '0.95rem',
                            boxShadow: 'var(--shadow-md)',
                            '&:hover': {
                                background: 'var(--gradient-primary-hover)',
                                transform: 'translateY(-2px)',
                                boxShadow: 'var(--shadow-lg)'
                            },
                            transition: 'all 0.2s ease'
                        }}
                    >
                        View {offer.countAvailableOffers} Offers
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
}