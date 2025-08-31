'use client';

import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link,
  IconButton,
  Divider,
  Stack,
  Chip
} from '@mui/material';
import {
  Facebook,
  Twitter,
  Instagram,
  LinkedIn,
  Email,
  Phone,
  LocationOn,
  Flight,
  Hotel,
  LocalOffer,
  YouTube
} from '@mui/icons-material';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    company: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
      { label: 'Blog', href: '/blog' }
    ],
    support: [
      { label: 'Help Center', href: '/help' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Safety', href: '/safety' },
      { label: 'Accessibility', href: '/accessibility' }
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'Sitemap', href: '/sitemap' }
    ]
  };

  const socialLinks = [
    { icon: <Facebook />, href: 'https://www.facebook.com/CHECK24de/?locale=de_DE', label: 'Facebook' },
    { icon: <Twitter />, href: 'https://twitter.com', label: 'Twitter' },
    { icon: <Instagram />, href: 'https://instagram.com', label: 'Instagram' },
    { icon: <YouTube />, href: 'https://www.youtube.com/@check24', label: 'YouTube' }
  ];

  return (
    <Box
      component="footer"
      sx={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: 'white',
        mt: 'auto',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
        }
      }}
    >
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* Main Footer Content */}
        <Grid container spacing={4}>
          {/* Brand Section */}
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 2
                }}
              >
                CHECK24
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255,255,255,0.8)',
                  mb: 3,
                  lineHeight: 1.6
                }}
              >
                Discover amazing destinations and create unforgettable memories with our curated travel experiences. Your journey begins here.
              </Typography>
              
              {/* Quick Stats */}
              <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                <Chip
                  icon={<Hotel />}
                  label="300K+ Hotels"
                  size="small"
                  sx={{
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                />
                <Chip
                  icon={<Flight />}
                  label="100M+ Airlines"
                  size="small"
                  sx={{
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                />
              </Stack>

              {/* Social Links */}
              <Stack direction="row" spacing={1}>
                {socialLinks.map((social, index) => (
                  <IconButton
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '50%',
                      width: 40,
                      height: 40,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.5)',
                        transform: 'translateY(-2px)',
                        background: 'rgba(255,255,255,0.1)'
                      }
                    }}
                    aria-label={social.label}
                  >
                    {social.icon}
                  </IconButton>
                ))}
              </Stack>
            </Box>
          </Grid>

          {/* Links Sections */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={4}>
              {/* Company Links */}
              <Grid item xs={6} sm={4}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                    color: 'white'
                  }}
                >
                  Company
                </Typography>
                <Stack spacing={1}>
                  {footerLinks.company.map((link, index) => (
                    <Link
                      key={index}
                      href={link.href}
                      sx={{
                        color: 'rgba(255,255,255,0.7)',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          color: 'white',
                          transform: 'translateX(4px)'
                        }
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </Stack>
              </Grid>

              {/* Support Links */}
              <Grid item xs={6} sm={4}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                    color: 'white'
                  }}
                >
                  Support
                </Typography>
                <Stack spacing={1}>
                  {footerLinks.support.map((link, index) => (
                    <Link
                      key={index}
                      href={link.href}
                      sx={{
                        color: 'rgba(255,255,255,0.7)',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          color: 'white',
                          transform: 'translateX(4px)'
                        }
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </Stack>
              </Grid>

              {/* Legal Links */}
              <Grid item xs={12} sm={4}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                    color: 'white'
                  }}
                >
                  Legal
                </Typography>
                <Stack spacing={1}>
                  {footerLinks.legal.map((link, index) => (
                    <Link
                      key={index}
                      href={link.href}
                      sx={{
                        color: 'rgba(255,255,255,0.7)',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          color: 'white',
                          transform: 'translateX(4px)'
                        }
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Contact Info */}
        <Box sx={{ mt: 4, mb: 4 }}>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 3 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Email sx={{ color: 'rgba(255,255,255,0.7)' }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  support@check24.com
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Phone sx={{ color: 'rgba(255,255,255,0.7)' }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  +49 (000) 000-0000
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Stack direction="row" spacing={1} alignItems="center">
                <LocationOn sx={{ color: 'rgba(255,255,255,0.7)' }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  CHECK24 GmbH, Germany
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Box>

        {/* Bottom Bar */}
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 3 }} />
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255,255,255,0.6)',
              textAlign: { xs: 'center', sm: 'left' }
            }}
          >
            © {currentYear} CHECK24. All rights reserved.
          </Typography>
          
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: 'center'
            }}
          >
            <Chip
              icon={<LocalOffer />}
              label="Best Price Guarantee"
              size="small"
              sx={{
                background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
                color: 'white',
                fontWeight: 500,
                '& .MuiChip-icon': {
                  color: 'white'
                }
              }}
            />
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;