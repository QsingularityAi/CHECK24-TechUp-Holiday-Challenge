import { Flight as FlightIcon} from "@mui/icons-material";
import { Box, Typography, Stack, Paper } from "@mui/material";

type FlightProps = {
    inbound: boolean,
    departureDatetime?: string,
    departureAirport?: string,
    arrivalAirport?: string,
    arrivalDatetime?: string
}

export default function Flight({...flight} : FlightProps) {

    function getDateString(s: string | null | undefined) : string {
        if(!s) return ""

        const date = new Date(s)
        return `${date.getDate()}.${date.getMonth()+1}.${date.getFullYear()}`;
    }

    function getHourMinuteString(s: string | null | undefined) : string {
        if(!s) return ""

        const date = new Date(s)
        return `${date.getHours()}:${date.getMinutes()}`
    }

    function getFlightDurationString(departure: string | undefined, arrival: string | undefined) : string {
        if(!departure || !arrival) {
            return "";
        }

        const date1 = new Date(arrival);
        const date2 = new Date(departure);
        const difference = Math.abs(date1.getTime() - date2.getTime());
        const hours = Math.floor(difference / (1000 * 3600))
        const minutes = Math.floor((difference - (hours * 1000 * 3600)) / (1000 * 60))
        return `${hours}h ${minutes}m`
    }

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                borderRadius: 'var(--border-radius-lg)',
                border: '1px solid rgba(0,0,0,0.08)',
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                    border: '1px solid var(--primary-200)',
                }
            }}
        >
            <Stack spacing={1}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <FlightIcon 
                        sx={{
                            rotate: flight.inbound ? "90deg" : "270deg", 
                            color: 'var(--primary-600)',
                            fontSize: 20,
                            transition: 'transform 0.3s ease',
                            '&:hover': { transform: 'scale(1.1)' }
                        }}
                    />
                    <Typography 
                        fontWeight="600" 
                        sx={{ 
                            color: 'var(--text-primary)',
                            fontSize: '0.95rem'
                        }}
                    >
                        {getDateString(flight.departureDatetime)}
                    </Typography>
                </Stack>
                
                <Stack direction="row" sx={{minHeight: "32px"}} alignItems="center" spacing={1}>
                    <Typography 
                        sx={{
                            width: "80px",
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem'
                        }}
                    >
                        {getHourMinuteString(flight.departureDatetime)}
                    </Typography>
                    <Box 
                        sx={{
                            width: "12px", 
                            height: "12px", 
                            borderRadius: "50%", 
                            backgroundColor: "var(--primary-500)",
                            boxShadow: '0 0 0 3px var(--primary-100)',
                            animation: 'pulse 2s ease-in-out infinite',
                            '@keyframes pulse': {
                                '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                                '50%': { transform: 'scale(1.1)', opacity: 0.8 }
                            }
                        }}
                    />
                    <Typography 
                        sx={{ 
                            color: 'var(--text-secondary)',
                            fontWeight: 500,
                            fontSize: '0.85rem'
                        }}
                    >
                        {flight.departureAirport}
                    </Typography>
                </Stack>
                
                <Stack direction="row" sx={{minHeight: "32px"}} alignItems="center">
                    <Box sx={{width: "80px"}} />
                    <Box 
                        sx={{
                            width: "2px", 
                            height: "24px", 
                            mx: "5px", 
                            background: 'linear-gradient(to bottom, var(--primary-400), var(--primary-600))',
                            borderRadius: '1px'
                        }}
                    />
                    <Typography 
                        fontWeight="400" 
                        sx={{ 
                            color: 'var(--text-secondary)',
                            fontSize: '0.8rem',
                            fontStyle: 'italic'
                        }}
                    >
                        {getFlightDurationString(flight.departureDatetime, flight.arrivalDatetime)}
                    </Typography>
                </Stack>
                
                <Stack direction="row" sx={{minHeight: "32px"}} alignItems="center" spacing={1}>
                    <Typography 
                        sx={{
                            width: "80px",
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem'
                        }}
                    >
                        {getHourMinuteString(flight.arrivalDatetime)}
                    </Typography>
                    <Box 
                        sx={{
                            width: "12px", 
                            height: "12px", 
                            borderRadius: "50%", 
                            backgroundColor: "var(--success-500)",
                            boxShadow: '0 0 0 3px var(--success-100)'
                        }}
                    />
                    <Typography 
                        sx={{ 
                            color: 'var(--text-secondary)',
                            fontWeight: 500,
                            fontSize: '0.85rem'
                        }}
                    >
                        {flight.arrivalAirport}
                    </Typography>
                </Stack>
            </Stack>
        </Paper>
    )
}