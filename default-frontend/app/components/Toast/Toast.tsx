import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Box, Typography, IconButton, Slide } from '@mui/material';
import { Close, CheckCircle, Error as ErrorIcon, Warning, Info } from '@mui/icons-material';

export interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
    onClose?: () => void;
    open: boolean;
}

const Toast: React.FC<ToastProps> = ({ 
    message, 
    type = 'info', 
    duration = 4000, 
    onClose, 
    open 
}) => {
    const [isVisible, setIsVisible] = useState(open);

    useEffect(() => {
        setIsVisible(open);
        
        if (open && duration > 0) {
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => onClose?.(), 300); // Wait for slide out animation
            }, duration);
            
            return () => clearTimeout(timer);
        }
    }, [open, duration, onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle sx={{ fontSize: 20 }} />;
            case 'error':
                return <ErrorIcon sx={{ fontSize: 20 }} />;
            case 'warning':
                return <Warning sx={{ fontSize: 20 }} />;
            case 'info':
            default:
                return <Info sx={{ fontSize: 20 }} />;
        }
    };

    const getColors = () => {
        switch (type) {
            case 'success':
                return {
                    bg: 'var(--success-50)',
                    border: 'var(--success-200)',
                    text: 'var(--success-800)',
                    icon: 'var(--success-600)'
                };
            case 'error':
                return {
                    bg: 'var(--error-50)',
                    border: 'var(--error-200)',
                    text: 'var(--error-800)',
                    icon: 'var(--error-600)'
                };
            case 'warning':
                return {
                    bg: 'var(--warning-50)',
                    border: 'var(--warning-200)',
                    text: 'var(--warning-800)',
                    icon: 'var(--warning-600)'
                };
            case 'info':
            default:
                return {
                    bg: 'var(--primary-50)',
                    border: 'var(--primary-200)',
                    text: 'var(--primary-800)',
                    icon: 'var(--primary-600)'
                };
        }
    };

    const colors = getColors();

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
    };

    return (
        <Slide direction="down" in={isVisible} mountOnEnter unmountOnExit>
            <Box
                sx={{
                    position: 'fixed',
                    top: 24,
                    right: 24,
                    zIndex: 9999,
                    minWidth: '320px',
                    maxWidth: '480px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 'var(--border-radius-lg)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    p: 2,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    animation: 'slideInBounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                    '@keyframes slideInBounce': {
                        '0%': {
                            transform: 'translateY(-100px) scale(0.8)',
                            opacity: 0
                        },
                        '60%': {
                            transform: 'translateY(10px) scale(1.05)',
                            opacity: 0.8
                        },
                        '100%': {
                            transform: 'translateY(0) scale(1)',
                            opacity: 1
                        }
                    }
                }}
            >
                {/* Icon */}
                <Box
                    sx={{
                        color: colors.icon,
                        mt: 0.25,
                        animation: 'iconPulse 2s ease-in-out infinite',
                        '@keyframes iconPulse': {
                            '0%, 100%': { transform: 'scale(1)' },
                            '50%': { transform: 'scale(1.1)' }
                        }
                    }}
                >
                    {getIcon()}
                </Box>

                {/* Message */}
                <Typography
                    variant="body2"
                    sx={{
                        color: colors.text,
                        fontWeight: 500,
                        flex: 1,
                        lineHeight: 1.4
                    }}
                >
                    {message}
                </Typography>

                {/* Close Button */}
                <IconButton
                    size="small"
                    onClick={handleClose}
                    sx={{
                        color: colors.text,
                        opacity: 0.7,
                        width: 24,
                        height: 24,
                        '&:hover': {
                            opacity: 1,
                            backgroundColor: 'rgba(0,0,0,0.05)',
                            transform: 'scale(1.1)'
                        },
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Close sx={{ fontSize: 16 }} />
                </IconButton>
            </Box>
        </Slide>
    );
};

export default Toast;

// Toast Provider Context

interface ToastContextType {
    showToast: (message: string, type?: ToastProps['type'], duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

interface ToastProviderProps {
    children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<Array<ToastProps & { id: string }>>([]);

    const showToast = (message: string, type: ToastProps['type'] = 'info', duration = 4000) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast = {
            id,
            message,
            type,
            duration,
            open: true,
            onClose: () => removeToast(id)
        };
        
        setToasts(prev => [...prev, newToast]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} />
            ))}
        </ToastContext.Provider>
    );
};