import { Button, Card, CardContent, Typography, Box, Chip, Paper, Zoom, Tooltip } from "@mui/material";
import { Stack } from "@mui/system";
import Flight from "@/app/components/Flight/Flight";
import {Components} from "@/app/types/openapi"
import { Bed, RestaurantMenu, Water, People, CalendarToday, BookOnline } from "@mui/icons-material";
import { useState } from 'react';
type Offer = Components.Schemas.Offer

export default function HotelOffer({offer}: {offer: Offer}) {
    const [isHovered, setIsHovered] = useState(false);
    function getTravelDurationString(departure: string | undefined, arrival: string | undefined) : string {
        if(!departure || !arrival) {
            return "";
        }

        const date1 = new Date(arrival);
        const date2 = new Date(departure);
        const difference = Math.abs(date1.getTime() - date2.getTime());
        return Math.ceil(difference / (1000 * 3600 * 24)).toString();
    }

    return (
        <Card
            elevation={0}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            sx={{
                background: 'var(--gradient-card)',
                borderRadius: 'var(--border-radius-lg)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(20px)',
                overflow: 'hidden',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                '&:hover': {
                    transform: 'translateY(-6px) scale(1.02)',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.4)'
                }
            }}
        >
            {/* Header with Trip Duration and Airports */}
            <Box
                sx={{
                    background: 'var(--gradient-primary)',
                    color: 'white',
                    p: { xs: 2, sm: 3 },
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: -20,
                        right: -20,
                        width: { xs: 80, sm: 100 },
                        height: { xs: 80, sm: 100 },
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)'
                    }}
                />
                
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    mb: 2,
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 1, sm: 0 }
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarToday sx={{ fontSize: { xs: 18, sm: 20 } }} />
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                fontWeight: 700,
                                fontSize: { xs: '1rem', sm: '1.25rem' }
                            }}
                        >
                            {getTravelDurationString(offer.outbundDepartureDatetime, offer.inboundArrivalDatetime)} Days
                        </Typography>
                    </Box>
                    <Zoom in timeout={600}>
                        <Chip
                            label="Best Value"
                            size="small"
                            sx={{
                                background: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                fontWeight: 600,
                                backdropFilter: 'blur(10px)',
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                animation: isHovered ? 'pulse 1.5s ease-in-out infinite' : 'none',
                                '@keyframes pulse': {
                                    '0%, 100%': { transform: 'scale(1)' },
                                    '50%': { transform: 'scale(1.05)' }
                                }
                            }}
                        />
                    </Zoom>
                </Box>

                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: { xs: 1, sm: 2 },
                    flexDirection: { xs: 'column', sm: 'row' }
                }}>
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                opacity: 0.9, 
                                mb: 0.5,
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}
                        >
                            From
                        </Typography>
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                fontWeight: 600,
                                fontSize: { xs: '0.9rem', sm: '1.25rem' }
                            }}
                        >
                            {offer.outboundDepartureAirport}
                        </Typography>
                    </Box>
                    
                    <Box sx={{ 
                        flex: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        transform: { xs: 'rotate(90deg)', sm: 'none' },
                        my: { xs: 1, sm: 0 }
                    }}>
                        <Box
                            sx={{
                                width: { xs: 30, sm: 40 },
                                height: 2,
                                background: 'rgba(255,255,255,0.5)',
                                position: 'relative',
                                transition: 'all 0.3s ease',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: isHovered ? '100%' : '0%',
                                    height: '100%',
                                    background: 'rgba(255,255,255,0.8)',
                                    transition: 'width 0.8s ease'
                                }
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    right: -6,
                                    top: -4,
                                    width: 0,
                                    height: 0,
                                    borderLeft: '6px solid rgba(255,255,255,0.5)',
                                    borderTop: '5px solid transparent',
                                    borderBottom: '5px solid transparent',
                                    transition: 'all 0.3s ease',
                                    transform: isHovered ? 'translateX(2px)' : 'translateX(0)'
                                }}
                            />
                        </Box>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                opacity: 0.9, 
                                mb: 0.5,
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}
                        >
                            To
                        </Typography>
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                fontWeight: 600,
                                fontSize: { xs: '0.9rem', sm: '1.25rem' }
                            }}
                        >
                            {offer.outboundArrivalAirport}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Content */}
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                {/* Flight Details */}
                <Paper
                    elevation={0}
                    sx={{
                        background: 'rgba(255,255,255,0.5)',
                        borderRadius: 'var(--border-radius-md)',
                        p: { xs: 1.5, sm: 2 },
                        mb: { xs: 2, sm: 3 },
                        border: '1px solid rgba(255,255,255,0.3)'
                    }}
                >
                    <Typography 
                        variant="subtitle2" 
                        sx={{ 
                            color: 'var(--text-secondary)', 
                            mb: 2, 
                            fontWeight: 600,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}
                    >
                        Flight Details
                    </Typography>
                    <Stack 
                        gap={2}
                        sx={{
                            '& .MuiStack-root': {
                                flexDirection: { xs: 'column', sm: 'row' },
                                gap: { xs: 1, sm: 2 }
                            }
                        }}
                    >
                        <Flight 
                            inbound={true} 
                            departureDatetime={offer.outbundDepartureDatetime}
                            departureAirport={offer.outboundDepartureAirport}
                            arrivalDatetime={offer.outboundArrivalDatetime}
                            arrivalAirport={offer.outboundArrivalAirport}
                        />
                        <Flight 
                            inbound={false} 
                            departureDatetime={offer.inboundDepartureDatetime}
                            departureAirport={offer.inboundDepartureAirport}
                            arrivalDatetime={offer.inboundArrivalDatetime}
                            arrivalAirport={offer.inboundArrivalAirport}
                        />
                    </Stack>
                </Paper>

                {/* Package Amenities */}
                <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                    <Typography 
                        variant="subtitle2" 
                        sx={{ 
                            color: 'var(--text-secondary)', 
                            mb: 2, 
                            fontWeight: 600,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}
                    >
                        Package Includes
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Tooltip title="Meal plan included" arrow>
                            <Chip
                                icon={<RestaurantMenu sx={{ fontSize: { xs: 14, sm: 16 } }} />}
                                label={offer.mealType}
                                size="small"
                                sx={{
                                    background: 'var(--gradient-accent)',
                                    color: 'white',
                                    fontWeight: 500,
                                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                    '& .MuiChip-icon': { color: 'white' },
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'scale(1.05)',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                    }
                                }}
                            />
                        </Tooltip>
                        <Tooltip title="Room accommodation" arrow>
                            <Chip
                                icon={<Bed sx={{ fontSize: { xs: 14, sm: 16 } }} />}
                                label={offer.roomType}
                                size="small"
                                sx={{
                                    background: 'var(--gradient-secondary)',
                                    color: 'white',
                                    fontWeight: 500,
                                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                    '& .MuiChip-icon': { color: 'white' },
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'scale(1.05)',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                    }
                                }}
                            />
                        </Tooltip>
                        {offer.oceanView && (
                            <Tooltip title="Beautiful ocean views" arrow>
                                <Chip
                                    icon={<Water sx={{ fontSize: { xs: 14, sm: 16 } }} />}
                                    label="Ocean View"
                                    size="small"
                                    sx={{
                                        background: 'linear-gradient(135deg, #00BCD4, #0097A7)',
                                        color: 'white',
                                        fontWeight: 500,
                                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                        '& .MuiChip-icon': { color: 'white' },
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'scale(1.05)',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                        }
                                    }}
                                />
                            </Tooltip>
                        )}
                    </Box>
                </Box>

                {/* Trip Information and Price */}
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 2, sm: 0 }
                }}>
                    <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
                        <Typography 
                            variant="subtitle2" 
                            sx={{ 
                                color: 'var(--text-secondary)', 
                                mb: 1, 
                                fontWeight: 600,
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}
                        >
                            Trip Details
                        </Typography>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            gap: { xs: 1, sm: 2 },
                            flexDirection: { xs: 'column', sm: 'row' }
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarToday sx={{ color: 'var(--text-secondary)', fontSize: { xs: 14, sm: 16 } }} />
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        color: 'var(--text-primary)',
                                        fontSize: { xs: '0.8rem', sm: '0.875rem' }
                                    }}
                                >
                                    {getTravelDurationString(offer.outbundDepartureDatetime, offer.inboundArrivalDatetime)} days
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <People sx={{ color: 'var(--text-secondary)', fontSize: { xs: 14, sm: 16 } }} />
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        color: 'var(--text-primary)',
                                        fontSize: { xs: '0.8rem', sm: '0.875rem' }
                                    }}
                                >
                                    {offer.countAdults} Adults{offer.countChildren > 0 && `, ${offer.countChildren} Children`}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                    
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: { xs: 'flex-start', sm: 'center' }, 
                        gap: { xs: 2, sm: 3 },
                        flexDirection: { xs: 'row', sm: 'row' },
                        justifyContent: { xs: 'space-between', sm: 'flex-end' },
                        width: { xs: '100%', sm: 'auto' }
                    }}>
                        <Box>
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    color: 'var(--text-secondary)', 
                                    mb: 0.5,
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                }}
                            >
                                Total Price
                            </Typography>
                            <Typography 
                                variant="h4" 
                                sx={{ 
                                    fontWeight: 800,
                                    color: 'var(--primary-600)',
                                    fontSize: { xs: '1.5rem', sm: '2rem' }
                                }}
                            >
                                €{offer.price}
                            </Typography>
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    color: 'var(--text-secondary)',
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                }}
                            >
                                for {offer.countAdults + offer.countChildren} travelers
                            </Typography>
                        </Box>
                        
                        <Zoom in timeout={800}>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<BookOnline sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                                sx={{
                                    background: 'var(--gradient-primary)',
                                    color: 'white',
                                    fontWeight: 700,
                                    px: { xs: 3, sm: 4 },
                                    py: { xs: 1.2, sm: 1.5 },
                                    borderRadius: 'var(--border-radius-md)',
                                    textTransform: 'none',
                                    fontSize: { xs: '0.9rem', sm: '1.1rem' },
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: '-100%',
                                        width: '100%',
                                        height: '100%',
                                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                                        transition: 'left 0.6s ease'
                                    },
                                    '&:hover': {
                                        background: 'var(--gradient-primary)',
                                        transform: 'translateY(-3px) scale(1.05)',
                                        boxShadow: '0 15px 40px rgba(0,0,0,0.25)',
                                        '&::before': {
                                            left: '100%'
                                        }
                                    },
                                    '&:active': {
                                        transform: 'translateY(-1px) scale(1.02)'
                                    },
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                Book Now
                            </Button>
                        </Zoom>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    )
}