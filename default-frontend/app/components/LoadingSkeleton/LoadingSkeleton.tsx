import React from 'react';
import { Box, Card, CardContent, Stack, Skeleton } from '@mui/material';

interface LoadingSkeletonProps {
    variant?: 'hotel' | 'search' | 'offer' | 'flight';
    count?: number;
}

export default function LoadingSkeleton({ variant = 'hotel', count = 1 }: LoadingSkeletonProps) {
    const renderHotelSkeleton = () => (
        <Card 
            elevation={0}
            sx={{
                display: 'flex',
                borderRadius: 'var(--border-radius-lg)',
                overflow: 'hidden',
                background: 'var(--gradient-card)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(20px)',
                minHeight: '240px',
                position: 'relative',
                animation: 'shimmer 1.5s ease-in-out infinite',
                '@keyframes shimmer': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.7 },
                    '100%': { opacity: 1 }
                }
            }}
        >
            {/* Image Skeleton */}
            <Box sx={{ width: '320px', minWidth: '320px', height: '240px' }}>
                <Skeleton 
                    variant="rectangular" 
                    width="100%" 
                    height="100%" 
                    sx={{ 
                        borderRadius: 0,
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)'
                    }} 
                />
            </Box>

            {/* Content Skeleton */}
            <CardContent sx={{ flex: 1, p: 3 }}>
                <Stack spacing={2}>
                    {/* Title */}
                    <Skeleton 
                        variant="text" 
                        width="80%" 
                        height={32} 
                        sx={{ 
                            background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)'
                        }} 
                    />
                    
                    {/* Chips */}
                    <Stack direction="row" spacing={1}>
                        <Skeleton 
                            variant="rounded" 
                            width={80} 
                            height={24} 
                            sx={{ 
                                borderRadius: 'var(--border-radius-md)',
                                background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)'
                            }} 
                        />
                        <Skeleton 
                            variant="rounded" 
                            width={90} 
                            height={24} 
                            sx={{ 
                                borderRadius: 'var(--border-radius-md)',
                                background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)'
                            }} 
                        />
                    </Stack>
                    
                    {/* Details */}
                    <Stack spacing={1}>
                        <Skeleton 
                            variant="text" 
                            width="60%" 
                            height={20} 
                            sx={{ 
                                background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)'
                            }} 
                        />
                        <Skeleton 
                            variant="text" 
                            width="70%" 
                            height={20} 
                            sx={{ 
                                background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)'
                            }} 
                        />
                    </Stack>
                    
                    {/* Price and Button */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 2 }}>
                        <Stack>
                            <Skeleton 
                                variant="text" 
                                width={80} 
                                height={16} 
                                sx={{ 
                                    background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)'
                                }} 
                            />
                            <Skeleton 
                                variant="text" 
                                width={100} 
                                height={32} 
                                sx={{ 
                                    background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)'
                                }} 
                            />
                        </Stack>
                        <Skeleton 
                            variant="rounded" 
                            width={140} 
                            height={48} 
                            sx={{ 
                                borderRadius: 'var(--border-radius-md)',
                                background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)'
                            }} 
                        />
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );

    const renderSearchSkeleton = () => (
        <Card 
            elevation={0}
            sx={{
                borderRadius: 'var(--border-radius-xl)',
                background: 'var(--gradient-card)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(20px)',
                p: 3,
                animation: 'shimmer 1.5s ease-in-out infinite',
                '@keyframes shimmer': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.7 },
                    '100%': { opacity: 1 }
                }
            }}
        >
            <Stack spacing={3}>
                {/* Form Fields */}
                {[1, 2, 3].map((row) => (
                    <Stack key={row} direction="row" spacing={2}>
                        {[1, 2, 3].map((col) => (
                            <Skeleton 
                                key={col}
                                variant="rounded" 
                                width="100%" 
                                height={56} 
                                sx={{ 
                                    borderRadius: 'var(--border-radius-md)',
                                    background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)'
                                }} 
                            />
                        ))}
                    </Stack>
                ))}
                
                {/* Search Button */}
                <Skeleton 
                    variant="rounded" 
                    width="100%" 
                    height={56} 
                    sx={{ 
                        borderRadius: 'var(--border-radius-md)',
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)'
                    }} 
                />
            </Stack>
        </Card>
    );

    const renderFlightSkeleton = () => (
        <Box 
            sx={{
                p: 2,
                borderRadius: 'var(--border-radius-lg)',
                border: '1px solid rgba(0,0,0,0.08)',
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(10px)',
                animation: 'shimmer 1.5s ease-in-out infinite',
                '@keyframes shimmer': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.7 },
                    '100%': { opacity: 1 }
                }
            }}
        >
            <Stack spacing={1}>
                {[1, 2, 3, 4].map((line) => (
                    <Stack key={line} direction="row" spacing={1} alignItems="center">
                        <Skeleton 
                            variant="circular" 
                            width={20} 
                            height={20} 
                            sx={{ 
                                background: 'linear-gradient(90deg, rgba(0,0,0,0.1) 25%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.1) 75%)'
                            }} 
                        />
                        <Skeleton 
                            variant="text" 
                            width={`${Math.random() * 40 + 40}%`} 
                            height={20} 
                            sx={{ 
                                background: 'linear-gradient(90deg, rgba(0,0,0,0.1) 25%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.1) 75%)'
                            }} 
                        />
                    </Stack>
                ))}
            </Stack>
        </Box>
    );

    const renderOfferSkeleton = () => (
        <Card 
            elevation={0}
            sx={{
                borderRadius: 'var(--border-radius-lg)',
                background: 'var(--gradient-card)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(20px)',
                p: 3,
                animation: 'shimmer 1.5s ease-in-out infinite',
                '@keyframes shimmer': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.7 },
                    '100%': { opacity: 1 }
                }
            }}
        >
            <Stack spacing={2}>
                <Skeleton 
                    variant="text" 
                    width="60%" 
                    height={24} 
                    sx={{ 
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)'
                    }} 
                />
                <Stack direction="row" spacing={2}>
                    <Skeleton 
                        variant="rounded" 
                        width={120} 
                        height={80} 
                        sx={{ 
                            borderRadius: 'var(--border-radius-md)',
                            background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)'
                        }} 
                    />
                    <Stack spacing={1} sx={{ flex: 1 }}>
                        <Skeleton 
                            variant="text" 
                            width="80%" 
                            height={20} 
                            sx={{ 
                                background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)'
                            }} 
                        />
                        <Skeleton 
                            variant="text" 
                            width="60%" 
                            height={20} 
                            sx={{ 
                                background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)'
                            }} 
                        />
                    </Stack>
                </Stack>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Skeleton 
                        variant="text" 
                        width={100} 
                        height={32} 
                        sx={{ 
                            background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)'
                        }} 
                    />
                    <Skeleton 
                        variant="rounded" 
                        width={120} 
                        height={40} 
                        sx={{ 
                            borderRadius: 'var(--border-radius-md)',
                            background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)'
                        }} 
                    />
                </Box>
            </Stack>
        </Card>
    );

    const renderSkeleton = () => {
        switch (variant) {
            case 'hotel':
                return renderHotelSkeleton();
            case 'search':
                return renderSearchSkeleton();
            case 'flight':
                return renderFlightSkeleton();
            case 'offer':
                return renderOfferSkeleton();
            default:
                return renderHotelSkeleton();
        }
    };

    return (
        <Stack spacing={2}>
            {Array.from({ length: count }, (_, index) => (
                <Box key={index}>
                    {renderSkeleton()}
                </Box>
            ))}
        </Stack>
    );
}