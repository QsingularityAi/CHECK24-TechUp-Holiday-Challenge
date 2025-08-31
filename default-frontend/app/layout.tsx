'use client';

import './globals.css'

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import {LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import React from "react";
import Nav from './components/Nav/Nav';
import Footer from '../src/components/Footer';
import { Box } from '@mui/material';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body style={{margin: 0, minHeight: '100vh'}}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box 
                    sx={{
                        minHeight: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'var(--gradient-bg)'
                    }}
                >
                    <Nav/>
                    <Box 
                        component="main"
                        sx={{
                            flex: 1,
                            width: '100%'
                        }}
                    >
                        {children}
                    </Box>
                    <Footer />
                </Box>
            </LocalizationProvider>
        </body>
    </html>
  )
}
