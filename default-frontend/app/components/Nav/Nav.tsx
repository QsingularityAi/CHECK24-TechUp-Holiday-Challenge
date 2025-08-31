import { Box, Container, Typography, IconButton, Stack } from "@mui/material";
import { Menu, Search, AccountCircle } from "@mui/icons-material";
import Image from "next/image";

export default function Nav() {
    return (
        <Box 
            sx={{
                background: 'rgba(26, 26, 46, 0.95)',
                backdropFilter: 'blur(20px)',
                width: '100%',
                height: { xs: '64px', sm: '72px', md: '80px' },
                position: 'sticky',
                top: 0,
                zIndex: 1000,
                borderBottom: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
        >
            <Container 
                maxWidth="xl" 
                sx={{
                    height: "100%", 
                    display: 'flex', 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    px: { xs: 2, sm: 3, md: 4 }
                }}
            >
                {/* Logo Section */}
                <Box 
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: { xs: 1, sm: 2 },
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease',
                        '&:hover': {
                            transform: 'scale(1.05)',
                        }
                    }}
                >
                    <Box sx={{ 
                        height: { xs: "32px", sm: "36px", md: "40px" }, 
                        width: { xs: 120, sm: 140, md: 160 }, 
                        position: "relative" 
                    }}>
                        <Image 
                            src="/logo.svg" 
                            alt="CHECK24 Logo" 
                            fill
                            style={{ objectFit: 'contain' }}
                        />
                    </Box>
                </Box>

                {/* Center Navigation */}
                <Stack 
                    direction="row" 
                    spacing={{ xs: 2, md: 3 }} 
                    sx={{ 
                        display: { xs: 'none', md: 'flex' },
                        alignItems: 'center'
                    }}
                >
                    <Typography 
                        variant="body1" 
                        sx={{
                            color: 'white',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                color: 'var(--accent-orange)',
                                transform: 'translateY(-1px)',
                            }
                        }}
                    >
                        Flights
                    </Typography>
                    <Typography 
                        variant="body1" 
                        sx={{
                            color: 'white',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                color: 'var(--accent-orange)',
                                transform: 'translateY(-1px)',
                            }
                        }}
                    >
                        Hotels
                    </Typography>
                    <Typography 
                        variant="body1" 
                        sx={{
                            color: 'white',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                color: 'var(--accent-orange)',
                                transform: 'translateY(-1px)',
                            }
                        }}
                    >
                        Packages
                    </Typography>
                </Stack>

                {/* Right Section */}
                <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} alignItems="center">
                    <IconButton 
                        sx={{
                            color: 'white',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                color: 'var(--accent-orange)',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                transform: 'scale(1.1)',
                            }
                        }}
                    >
                        <Search />
                    </IconButton>
                    <IconButton 
                        sx={{
                            color: 'white',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                color: 'var(--accent-orange)',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                transform: 'scale(1.1)',
                            }
                        }}
                    >
                        <AccountCircle />
                    </IconButton>
                    <IconButton 
                        sx={{
                            color: 'white',
                            display: { xs: 'flex', md: 'none' },
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                color: 'var(--accent-orange)',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                transform: 'scale(1.1)',
                            }
                        }}
                    >
                        <Menu />
                    </IconButton>
                    
                    <Typography 
                        variant="body2" 
                        sx={{
                            color: 'rgba(255,255,255,0.8)',
                            fontWeight: 600,
                            ml: { xs: 1, sm: 2 },
                            px: { xs: 1.5, sm: 2 },
                            py: 0.5,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            borderRadius: 'var(--border-radius-md)',
                            background: 'rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            display: { xs: 'none', sm: 'block' }
                        }}
                    >
                        GenDev 2023
                    </Typography>
                </Stack>
            </Container>
        </Box>
    )
}