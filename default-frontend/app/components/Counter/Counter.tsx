import React from "react";
import {IconButton, Typography, Box, Paper, Zoom, Tooltip} from "@mui/material";
import {Add, Remove} from "@mui/icons-material";
import { useState } from 'react';

export default function Counter({label, value, setValue} : {label: string,value: number, setValue: React.Dispatch<React.SetStateAction<number>>}) {
    const [isAnimating, setIsAnimating] = useState(false);

    const handleIncrement = () => {
        setIsAnimating(true);
        setValue(value + 1);
        setTimeout(() => setIsAnimating(false), 300);
    };

    const handleDecrement = () => {
        if (value > 0) {
            setIsAnimating(true);
            setValue(value - 1);
            setTimeout(() => setIsAnimating(false), 300);
        }
    };
   return (
       <Box sx={{ width: '100%' }}>
           <Typography 
               variant="subtitle2" 
               sx={{
                   mb: 1,
                   color: 'var(--text-secondary)',
                   fontWeight: 600,
                   fontSize: '0.875rem'
               }}
           >
               {label}
           </Typography>
           <Paper
               elevation={0}
               sx={{
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'space-between',
                   p: 1,
                   borderRadius: 'var(--border-radius-md)',
                   border: '1px solid rgba(0,0,0,0.12)',
                   background: 'rgba(255,255,255,0.8)',
                   backdropFilter: 'blur(10px)',
                   minWidth: '120px',
                   transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                   '&:hover': {
                       transform: 'translateY(-2px)',
                       boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                       background: 'rgba(255,255,255,0.9)'
                   }
               }}
           >
               <Tooltip title={`Decrease ${label.toLowerCase()}`} arrow>
                   <span>
                       <IconButton 
                           disabled={value === 0} 
                           size="small" 
                           onClick={handleDecrement}
                           sx={{
                               color: value === 0 ? 'var(--text-disabled)' : 'var(--primary-600)',
                               backgroundColor: value === 0 ? 'transparent' : 'var(--primary-50)',
                               border: `1px solid ${value === 0 ? 'var(--border-light)' : 'var(--primary-200)'}`,
                               borderRadius: 'var(--border-radius-sm)',
                               width: 32,
                               height: 32,
                               position: 'relative',
                               overflow: 'hidden',
                               '&::before': {
                                   content: '""',
                                   position: 'absolute',
                                   top: '50%',
                                   left: '50%',
                                   width: 0,
                                   height: 0,
                                   borderRadius: '50%',
                                   background: 'rgba(255,255,255,0.6)',
                                   transition: 'all 0.3s ease',
                                   transform: 'translate(-50%, -50%)'
                               },
                               '&:hover': {
                                   backgroundColor: value === 0 ? 'transparent' : 'var(--primary-100)',
                                   borderColor: value === 0 ? 'var(--border-light)' : 'var(--primary-300)',
                                   transform: value === 0 ? 'none' : 'scale(1.15) rotate(-5deg)',
                                   boxShadow: value === 0 ? 'none' : '0 4px 12px rgba(0,0,0,0.15)',
                                   '&::before': {
                                       width: '100%',
                                       height: '100%'
                                   }
                               },
                               '&:active': {
                                   transform: value === 0 ? 'none' : 'scale(0.95)'
                               },
                               '&:disabled': {
                                   backgroundColor: 'transparent',
                                   borderColor: 'var(--border-light)',
                                   transform: 'none'
                               },
                               transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                           }}
                       >
                           <Remove sx={{ fontSize: 16 }} />
                       </IconButton>
                   </span>
               </Tooltip>
               
               <Zoom in timeout={300}>
                   <Box
                       sx={{
                           minWidth: '24px',
                           textAlign: 'center',
                           position: 'relative',
                           overflow: 'hidden',
                           transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                           transform: isAnimating ? 'scale(1.2)' : 'scale(1)',
                           '&::before': {
                               content: '""',
                               position: 'absolute',
                               top: 0,
                               left: '-100%',
                               width: '100%',
                               height: '100%',
                               background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                               transition: 'left 0.6s ease'
                           },
                           '&:hover::before': {
                               left: '100%'
                           }
                       }}
                   >
                       <Typography 
                           variant="body1" 
                           sx={{
                               fontWeight: 600,
                               color: 'var(--text-primary)',
                               fontSize: '1rem',
                               position: 'relative',
                               zIndex: 1
                           }}
                       >
                           {value}
                       </Typography>
                   </Box>
               </Zoom>
               
               <Tooltip title={`Increase ${label.toLowerCase()}`} arrow>
                   <span>
                       <IconButton 
                           size="small" 
                           onClick={handleIncrement}
                           sx={{
                               color: 'var(--primary-600)',
                               backgroundColor: 'var(--primary-50)',
                               border: '1px solid var(--primary-200)',
                               borderRadius: 'var(--border-radius-sm)',
                               width: 32,
                               height: 32,
                               position: 'relative',
                               overflow: 'hidden',
                               '&::before': {
                                   content: '""',
                                   position: 'absolute',
                                   top: '50%',
                                   left: '50%',
                                   width: 0,
                                   height: 0,
                                   borderRadius: '50%',
                                   background: 'rgba(255,255,255,0.6)',
                                   transition: 'all 0.3s ease',
                                   transform: 'translate(-50%, -50%)'
                               },
                               '&:hover': {
                                   backgroundColor: 'var(--primary-100)',
                                   borderColor: 'var(--primary-300)',
                                   transform: 'scale(1.15) rotate(5deg)',
                                   boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                   '&::before': {
                                       width: '100%',
                                       height: '100%'
                                   }
                               },
                               '&:active': {
                                   transform: 'scale(0.95)'
                               },
                               transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                           }}
                       >
                           <Add sx={{ fontSize: 16 }} />
                       </IconButton>
                   </span>
               </Tooltip>
           </Paper>
       </Box>
   )
}