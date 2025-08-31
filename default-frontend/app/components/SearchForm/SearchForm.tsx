import React, {useEffect, useState} from 'react';
import './SearchForm.css';
import {
    Box, Button,
    Checkbox,
    Chip,
    FormControl, InputLabel,
    ListItemText,
    MenuItem,
    Select,
    SelectChangeEvent, Stack,
    TextField, Typography,
    Card,
    CardContent,
    Collapse,
    Grid,
    Paper
} from "@mui/material";
import { ExpandMore, ExpandLess, Search, FilterList, Clear } from "@mui/icons-material";
import {DatePicker} from "@mui/x-date-pickers";
import Counter from "@/app/components/Counter/Counter";
import { useSearchParams } from 'next/navigation';
import { GetBestOffersByHotelFromQuery } from '@/app/types/converter';
import dayjs, { Dayjs } from 'dayjs';

type Properties = {
    submitCallback: (
        departureAirports: string[], 
        countAdults: number, 
        countChildren: number, 
        duration: number, 
        earliestDeparture: string | undefined, 
        latestReturn: string | undefined,
        // New advanced filters
        mealTypes?: string[],
        roomTypes?: string[],
        oceanView?: boolean,
        minPrice?: number,
        maxPrice?: number,
        hotelStars?: number[]
    ) => Promise<void>
}

interface Airport {
    code: string,
    name: string
}

// Dynamically generated from offers data (replace with API or static import as needed)
const availableDepartureAirports: Airport[] = [
    {code: "MUC", name: "Munich"},
    {code: "FRA", name: "Frankfurt"},
    {code: "PMI", name: "Palma de Mallorca"},
    {code: "HAJ", name: "Hannover"},
    {code: "HAM", name: "Hamburg"},
    {code: "STR", name: "Stuttgart"},
    {code: "LEJ", name: "Leipzig"},
    {code: "DUS", name: "Düsseldorf"},
    {code: "CGN", name: "Cologne"},
    {code: "BER", name: "Berlin"},
    {code: "FMO", name: "Münster"},
    {code: "PAD", name: "Paderborn"},
    {code: "DTM", name: "Dortmund"},
    {code: "BRE", name: "Bremen"},
    {code: "NUE", name: "Nuremberg"},
    {code: "FKB", name: "Karlsruhe/Baden-Baden"},
    {code: "SCN", name: "Saarbrücken"},
    {code: "LUX", name: "Luxembourg"},
    {code: "BSL", name: "Basel"},
    {code: "ZRH", name: "Zurich"},
    {code: "FDH", name: "Friedrichshafen"},
    {code: "FMM", name: "Memmingen"},
];

// Available meal types
const availableMealTypes = [
    'Breakfast',
    'Half Board',
    'Full Board',
    'All Inclusive',
    'Room Only'
];

// Available room types  
const availableRoomTypes = [
    'Standard Room',
    'Superior Room',
    'Deluxe Room',
    'Junior Suite',
    'Suite',
    'Family Room',
    'Twin Room',
    'Double Room',
    'Ocean View Room',
    'Balcony Room'
];

// Available star ratings
const availableStarRatings = [1, 2, 3, 4, 5];

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
        },
    },
};


export default function SearchForm({submitCallback}: Properties) {
    // Set sensible defaults for valid backend requests
    const [departureAirports, setDepartureAirports] = useState<string[]>(["MUC"]);
    const [customAirportCode, setCustomAirportCode] = useState<string>("");
    const [countChildren, setCountChildren] = useState<number>(0);
    const [countAdults, setCountAdults] = useState<number>(1);
    const [duration, setDuration] = useState<number>(7);
    const [durationInput, setDurationInput] = useState<string>("7");
    const [durationManuallySet, setDurationManuallySet] = useState<boolean>(false);
    const [earliestDepartureDate, setEarliestDepartureDate] = useState<Dayjs | null>(null);
    const [latestReturnDate, setLatestReturnDate] = useState<Dayjs | null>(null);
    
    // New advanced filter states
    const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
    const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>([]);
    const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);
    const [oceanViewOnly, setOceanViewOnly] = useState<boolean>(false);
    const [minPrice, setMinPrice] = useState<string>("");
    const [maxPrice, setMaxPrice] = useState<string>("");
    const [selectedStarRatings, setSelectedStarRatings] = useState<number[]>([]);
    
    const query = useSearchParams();

    useEffect(() => {
        const params = GetBestOffersByHotelFromQuery(query)
        setDepartureAirports(params.departureAirports && params.departureAirports.length > 0 ? params.departureAirports : ["MUC"]);
        setCountChildren(isNaN(params.countChildren) ? 0 : params.countChildren);
        setCountAdults(isNaN(params.countAdults) ? 1 : params.countAdults);
        setDuration(isNaN(params.duration) ? 7 : params.duration);
        setDurationInput(params.duration ? params.duration.toString() : "7");
        setEarliestDepartureDate(params.earliestDepartureDate ? dayjs(params.earliestDepartureDate) : null);
        setLatestReturnDate(params.latestReturnDate ? dayjs(params.latestReturnDate) : null);
    }, [query])

    const handleAirportChange = (event: SelectChangeEvent<typeof departureAirports>) => {
        const {target: {value}} = event;
        setDepartureAirports(
            typeof value === 'string' ? value.split(',') : value,
        );
    };

    const handleCustomAirportInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        const code = event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
        setCustomAirportCode(code);
    };

    const handleAddCustomAirport = () => {
        if (customAirportCode.length === 3 && !departureAirports.includes(customAirportCode)) {
            setDepartureAirports([...departureAirports, customAirportCode]);
            setCustomAirportCode("");
        }
    };

    const handleDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setDurationInput(value);
        setDurationManuallySet(true);

        const duration = parseInt(value);
        if(isNaN(duration) || duration < 1) {
            setDuration(7);
            setDurationInput("7");
            return;
        }
        setDuration(duration);
    }

    // Automatically calculate duration when both dates are set, unless manually set
    useEffect(() => {
        if (
            earliestDepartureDate && latestReturnDate &&
            !durationManuallySet
        ) {
            const diff = latestReturnDate.diff(earliestDepartureDate, 'day');
            if (diff > 0) {
                setDuration(diff);
                setDurationInput(diff.toString());
            }
        }
    }, [earliestDepartureDate, latestReturnDate]);

    // Reset manual flag if dates are cleared
    useEffect(() => {
        if (!earliestDepartureDate || !latestReturnDate) {
            setDurationManuallySet(false);
        }
    }, [earliestDepartureDate, latestReturnDate]);

    return (
        <Card 
            sx={{
                background: 'var(--gradient-card)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 'var(--border-radius-lg)',
                boxShadow: 'var(--shadow-xl)',
                overflow: 'visible'
            }}
        >
            <CardContent sx={{ 
                p: { xs: 2, sm: 3, md: 4 },
                '&:last-child': { pb: { xs: 2, sm: 3, md: 4 } }
            }}>
                <Typography 
                    variant="h5" 
                    sx={{
                        mb: 3,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        textAlign: 'center'
                    }}
                >
                    Find Your Perfect Holiday
                </Typography>
                
                <Stack spacing={{ xs: 2, sm: 2.5, md: 4 }}>
                    {/* Main Search Section */}
                    <Paper 
                        elevation={0}
                        sx={{
                            p: { xs: 2, sm: 2.5, md: 3 },
                            borderRadius: 'var(--border-radius-md)',
                            background: 'rgba(255,255,255,0.8)',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
                            {/* Departure Airports */}
                            <Grid item xs={12} sm={6} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel id="departure-airport-label">Departure Airport</InputLabel>
                                    <Select
                                        id="departure-airport"
                                        multiple
                                        label="Departure Airport"
                                        labelId="departure-airport-label"
                                        value={departureAirports}
                                        onChange={handleAirportChange}
                                        MenuProps={MenuProps}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 'var(--border-radius-md)',
                                            }
                                        }}
                                        renderValue={(selected) => (
                                            <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5}}>
                                                {selected.map((value) => {
                                                    const airport = availableDepartureAirports.find(a => a.code === value);
                                                    const displayLabel = airport ? `${airport.code} (${airport.name})` : value;
                                                    return (
                                                        <Chip 
                                                            key={value} 
                                                            label={displayLabel}
                                                            size="small"
                                                            sx={{
                                                                backgroundColor: 'var(--primary-blue)',
                                                                color: 'white',
                                                                fontWeight: 500,
                                                                border: '1px solid var(--primary-blue-dark)',
                                                                '&:hover': {
                                                                    backgroundColor: 'var(--primary-blue-dark)'
                                                                }
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </Box>
                                        )}
                                    >
                                        {availableDepartureAirports.map((airport) => (
                                            <MenuItem key={airport.code} value={airport.code}>
                                                <Checkbox 
                                                    checked={departureAirports.indexOf(airport.code) > -1}
                                                    sx={{
                                                        color: 'var(--primary-blue)',
                                                        '&.Mui-checked': {
                                                            color: 'var(--primary-blue-dark)',
                                                        }
                                                    }}
                                                />
                                                <ListItemText primary={airport.code + (airport.name ? ` (${airport.name})` : '')}/>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    <Box sx={{mt: 2, display: 'flex', gap: 1}}>
                                        <TextField
                                            label="Custom Airport Code"
                                            size="small"
                                            variant="outlined"
                                            value={customAirportCode}
                                            onChange={handleCustomAirportInput}
                                            placeholder="e.g. LHR"
                                            inputProps={{maxLength: 3}}
                                            sx={{
                                                flex: 1,
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 'var(--border-radius-md)',
                                                }
                                            }}
                                        />
                                        <Button
                                            variant="outlined"
                                            onClick={handleAddCustomAirport}
                                            disabled={customAirportCode.length !== 3 || departureAirports.includes(customAirportCode)}
                                            sx={{
                                                borderRadius: 'var(--border-radius-md)',
                                                borderColor: 'var(--primary-blue)',
                                                color: 'var(--primary-blue-dark)',
                                                '&:hover': {
                                                    borderColor: 'var(--primary-blue-dark)',
                                                    backgroundColor: 'var(--gray-50)',
                                                }
                                            }}
                                        >
                                            Add
                                        </Button>
                                    </Box>
                                </FormControl>
                            </Grid>
                            
                            {/* Travelers */}
                            <Grid item xs={12} sm={6} md={6}>
                                <Stack spacing={2}>
                                    <Typography variant="subtitle2" sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                                        Travelers
                                    </Typography>
                                    <Stack direction="row" spacing={2}>
                                        <Counter label="Adults" value={countAdults} setValue={setCountAdults}/>
                                        <Counter label="Children" value={countChildren} setValue={setCountChildren}/>
                                    </Stack>
                                </Stack>
                            </Grid>
                            
                            {/* Duration */}
                            <Grid item xs={6} sm={6} md={4}>
                                <TextField 
                                    fullWidth
                                    label="Duration (days)" 
                                    value={durationInput} 
                                    onChange={handleDurationChange}
                                    type="number" 
                                    variant="outlined"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 'var(--border-radius-md)',
                                        }
                                    }}
                                />
                            </Grid>
                            
                            {/* Dates */}
                            <Grid item xs={12} sm={6} md={4}>
                                <DatePicker 
                                    label="Earliest Departure"
                                    value={earliestDepartureDate} 
                                    onChange={(value) => setEarliestDepartureDate(value)}
                                    sx={{
                                        width: '100%',
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 'var(--border-radius-md)',
                                        }
                                    }}
                                />
                            </Grid>
                            
                            <Grid item xs={12} sm={6} md={4}>
                                <DatePicker 
                                    label="Latest Return"
                                    value={latestReturnDate} 
                                    onChange={(value) => setLatestReturnDate(value)}
                                    sx={{
                                        width: '100%',
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 'var(--border-radius-md)',
                                        }
                                    }}
                                />
                            </Grid>
                        </Grid>
                    </Paper>
                
                    {/* Advanced Filters Toggle */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Button 
                            variant="outlined" 
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            startIcon={<FilterList />}
                            endIcon={showAdvancedFilters ? <ExpandLess /> : <ExpandMore />}
                            sx={{
                                borderRadius: 'var(--border-radius-md)',
                                borderColor: 'var(--primary-blue)',
                                color: 'var(--primary-blue-dark)',
                                px: { xs: 2, sm: 3 },
                                py: { xs: 1, sm: 1.5 },
                                fontSize: { xs: '0.9rem', sm: '1rem' },
                                '&:hover': {
                                    borderColor: 'var(--primary-blue-dark)',
                                    backgroundColor: 'var(--gray-50)',
                                }
                            }}
                        >
                            {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
                        </Button>
                    </Box>

                    <Collapse in={showAdvancedFilters}>
                        <Paper 
                            elevation={0}
                            sx={{
                                mt: 3,
                                p: { xs: 2, sm: 2.5, md: 3 },
                                borderRadius: 'var(--border-radius-md)',
                                background: 'rgba(255,255,255,0.6)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.3)'
                            }}
                        >
                            <Typography 
                                variant="h6" 
                                sx={{ 
                                    mb: 3, 
                                    color: 'var(--text-primary)', 
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}
                            >
                                <FilterList /> Advanced Filters
                            </Typography>
                            
                            <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
                                {/* Price Range */}
                                <Grid item xs={12} sm={6} md={6}>
                                    <Stack spacing={2}>
                                        <Typography variant="subtitle2" sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                                            Price Range (€)
                                        </Typography>
                                        <Stack direction="row" spacing={2}>
                                            <TextField 
                                                label="Min Price" 
                                                value={minPrice} 
                                                onChange={(e) => setMinPrice(e.target.value)}
                                                type="number" 
                                                variant="outlined"
                                                sx={{
                                                    flex: 1,
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 'var(--border-radius-md)',
                                                    }
                                                }}
                                            />
                                            <TextField 
                                                label="Max Price" 
                                                value={maxPrice} 
                                                onChange={(e) => setMaxPrice(e.target.value)}
                                                type="number" 
                                                variant="outlined"
                                                sx={{
                                                    flex: 1,
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 'var(--border-radius-md)',
                                                    }
                                                }}
                                            />
                                        </Stack>
                                    </Stack>
                                </Grid>
                                
                                {/* Star Rating */}
                                <Grid item xs={12} sm={6} md={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Hotel Stars</InputLabel>
                                        <Select
                                            multiple
                                            value={selectedStarRatings}
                                            onChange={(e) => setSelectedStarRatings(typeof e.target.value === 'string' ? [] : e.target.value)}
                                            label="Hotel Stars"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 'var(--border-radius-md)',
                                                }
                                            }}
                                            renderValue={(selected) => (
                                                <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5}}>
                                                    {selected.map((value) => (
                                                        <Chip 
                                                            key={value} 
                                                            label={`${value} star${value > 1 ? 's' : ''}`}
                                                            size="small"
                                                            sx={{
                                                                backgroundColor: 'var(--primary-blue)',
                                                                color: 'white',
                                                                fontWeight: 500
                                                            }}
                                                        />
                                                    ))}
                                                </Box>
                                            )}
                                        >
                                            {availableStarRatings.map((stars) => (
                                                <MenuItem key={stars} value={stars}>
                                                    <Checkbox 
                                                        checked={selectedStarRatings.indexOf(stars) > -1}
                                                        sx={{
                                                            color: 'var(--primary-blue)',
                                                            '&.Mui-checked': {
                                                                color: 'var(--primary-blue-dark)',
                                                            }
                                                        }}
                                                    />
                                                    <ListItemText primary={`${stars} star${stars > 1 ? 's' : ''}`} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                
                                {/* Meal Type */}
                                <Grid item xs={12} sm={6} md={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Meal Types</InputLabel>
                                        <Select
                                            multiple
                                            value={selectedMealTypes}
                                            onChange={(e) => setSelectedMealTypes(typeof e.target.value === 'string' ? [] : e.target.value)}
                                            label="Meal Types"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 'var(--border-radius-md)',
                                                }
                                            }}
                                            renderValue={(selected) => (
                                                <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5}}>
                                                    {selected.map((value) => (
                                                        <Chip 
                                                            key={value} 
                                                            label={value}
                                                            size="small"
                                                            sx={{
                                                                backgroundColor: 'var(--primary-blue)',
                                                                color: 'white',
                                                                fontWeight: 500
                                                            }}
                                                        />
                                                    ))}
                                                </Box>
                                            )}
                                        >
                                            {availableMealTypes.map((mealType) => (
                                                <MenuItem key={mealType} value={mealType}>
                                                    <Checkbox 
                                                        checked={selectedMealTypes.indexOf(mealType) > -1}
                                                        sx={{
                                                            color: 'var(--primary-blue)',
                                                            '&.Mui-checked': {
                                                                color: 'var(--primary-blue-dark)',
                                                            }
                                                        }}
                                                    />
                                                    <ListItemText primary={mealType} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                
                                {/* Room Type */}
                                <Grid item xs={12} sm={6} md={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Room Types</InputLabel>
                                        <Select
                                            multiple
                                            value={selectedRoomTypes}
                                            onChange={(e) => setSelectedRoomTypes(typeof e.target.value === 'string' ? [] : e.target.value)}
                                            label="Room Types"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 'var(--border-radius-md)',
                                                }
                                            }}
                                            renderValue={(selected) => (
                                                <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5}}>
                                                    {selected.map((value) => (
                                                        <Chip 
                                                            key={value} 
                                                            label={value}
                                                            size="small"
                                                            sx={{
                                                                backgroundColor: 'var(--primary-blue)',
                                                                color: 'white',
                                                                fontWeight: 500
                                                            }}
                                                        />
                                                    ))}
                                                </Box>
                                            )}
                                        >
                                            {availableRoomTypes.map((roomType) => (
                                                <MenuItem key={roomType} value={roomType}>
                                                    <Checkbox 
                                                        checked={selectedRoomTypes.indexOf(roomType) > -1}
                                                        sx={{
                                                            color: 'var(--primary-blue)',
                                                            '&.Mui-checked': {
                                                                color: 'var(--primary-blue-dark)',
                                                            }
                                                        }}
                                                    />
                                                    <ListItemText primary={roomType} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                
                                {/* Ocean View */}
                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Checkbox
                                            checked={oceanViewOnly}
                                            onChange={(e) => setOceanViewOnly(e.target.checked)}
                                            sx={{
                                                color: 'var(--primary-blue)',
                                                '&.Mui-checked': {
                                                    color: 'var(--primary-blue-dark)',
                                                }
                                            }}
                                        />
                                        <Typography sx={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                            Ocean View Only
                                        </Typography>
                                    </Box>
                                </Grid>
                                
                                {/* Clear Filters Button */}
                                <Grid item xs={12}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<Clear />}
                                        onClick={() => {
                                            setSelectedMealTypes([]);
                                            setSelectedRoomTypes([]);
                                            setOceanViewOnly(false);
                                            setMinPrice("");
                                            setMaxPrice("");
                                            setSelectedStarRatings([]);
                                        }}
                                        sx={{
                                            borderRadius: 'var(--border-radius-md)',
                                            borderColor: 'var(--secondary-500)',
                                            color: 'var(--secondary-600)',
                                            '&:hover': {
                                                borderColor: 'var(--secondary-600)',
                                                backgroundColor: 'var(--secondary-50)',
                                            }
                                        }}
                                    >
                                        Clear All Filters
                                    </Button>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Collapse>

                    {/* Search Button */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 3, sm: 3.5, md: 4 } }}>
                        <Button 
                            variant="contained" 
                            onClick={() =>
                                // parameters should be validated here, but as this is a just a very simple implementation we skip this for now
                                submitCallback(
                                    departureAirports, 
                                    countAdults, countChildren, 
                                    duration, 
                                    earliestDepartureDate ? earliestDepartureDate.toISOString() : undefined, 
                                    latestReturnDate ? latestReturnDate.toISOString() : undefined,
                                    // Pass advanced filters
                                    selectedMealTypes.length > 0 ? selectedMealTypes : undefined,
                                    selectedRoomTypes.length > 0 ? selectedRoomTypes : undefined,
                                    oceanViewOnly || undefined,
                                    minPrice ? parseFloat(minPrice) : undefined,
                                    maxPrice ? parseFloat(maxPrice) : undefined,
                                    selectedStarRatings.length > 0 ? selectedStarRatings : undefined
                                )
                            }
                            size="large"
                            startIcon={<Search />}
                            sx={{
                                background: 'var(--gradient-primary)',
                                borderRadius: 'var(--border-radius-md)',
                                px: { xs: 3, sm: 4 },
                                py: { xs: 1.2, sm: 1.5 },
                                fontSize: { xs: '1rem', sm: '1.1rem' },
                                fontWeight: 600,
                                textTransform: 'none',
                                boxShadow: 'var(--shadow-lg)',
                                width: { xs: '100%', sm: 'auto' },
                                minWidth: { sm: '200px' },
                                '&:hover': {
                                    background: 'var(--gradient-primary-hover)',
                                    transform: 'translateY(-2px)',
                                    boxShadow: 'var(--shadow-xl)',
                                },
                                transition: 'all 0.3s ease'
                            }}
                        >
                            Search Holidays
                        </Button>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}
