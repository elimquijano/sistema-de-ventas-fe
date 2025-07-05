import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  useTheme,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Add as AddIcon,
  Today as TodayIcon,
} from '@mui/icons-material';

const mockEvents = [
  {
    id: 1,
    title: 'Team Meeting',
    date: '2024-01-15',
    time: '10:00',
    type: 'meeting',
    color: '#2196f3',
  },
  {
    id: 2,
    title: 'Project Deadline',
    date: '2024-01-18',
    time: '23:59',
    type: 'deadline',
    color: '#f44336',
  },
  {
    id: 3,
    title: 'Client Presentation',
    date: '2024-01-22',
    time: '14:00',
    type: 'presentation',
    color: '#ff9800',
  },
  {
    id: 4,
    title: 'Code Review',
    date: '2024-01-25',
    time: '09:00',
    type: 'review',
    color: '#4caf50',
  },
];

const eventTypes = [
  { value: 'meeting', label: 'Meeting', color: '#2196f3' },
  { value: 'deadline', label: 'Deadline', color: '#f44336' },
  { value: 'presentation', label: 'Presentation', color: '#ff9800' },
  { value: 'review', label: 'Review', color: '#4caf50' },
  { value: 'other', label: 'Other', color: '#9c27b0' },
];

export const Calendar = () => {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState(mockEvents);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    type: 'meeting',
    description: '',
  });

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    const dateString = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateString);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setFormData({
      title: '',
      date: date.toISOString().split('T')[0],
      time: '',
      type: 'meeting',
      description: '',
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDate(null);
  };

  const handleSaveEvent = () => {
    const newEvent = {
      id: Date.now(),
      ...formData,
      color: eventTypes.find(type => type.value === formData.type)?.color || '#2196f3',
    };
    setEvents([...events, newEvent]);
    handleCloseDialog();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = getDaysInMonth(currentDate);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Calendar
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{
            background: 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)',
          }}
        >
          Add Event
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              {/* Calendar Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton onClick={handlePreviousMonth}>
                    <ChevronLeftIcon />
                  </IconButton>
                  <Typography variant="h5" sx={{ fontWeight: 600, minWidth: 200, textAlign: 'center' }}>
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </Typography>
                  <IconButton onClick={handleNextMonth}>
                    <ChevronRightIcon />
                  </IconButton>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<TodayIcon />}
                  onClick={handleToday}
                >
                  Today
                </Button>
              </Box>

              {/* Calendar Grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                {/* Day Headers */}
                {dayNames.map((day) => (
                  <Box
                    key={day}
                    sx={{
                      p: 1,
                      textAlign: 'center',
                      fontWeight: 600,
                      color: 'text.secondary',
                      borderBottom: 1,
                      borderColor: 'divider',
                    }}
                  >
                    {day}
                  </Box>
                ))}

                {/* Calendar Days */}
                {days.map((day, index) => {
                  const dayEvents = day ? getEventsForDate(day) : [];
                  const isToday = day && day.toDateString() === new Date().toDateString();
                  
                  return (
                    <Box
                      key={index}
                      sx={{
                        minHeight: 100,
                        p: 1,
                        border: 1,
                        borderColor: 'divider',
                        cursor: day ? 'pointer' : 'default',
                        backgroundColor: isToday ? 'primary.light' : 'transparent',
                        '&:hover': {
                          backgroundColor: day ? 'action.hover' : 'transparent',
                        },
                      }}
                      onClick={() => day && handleDateClick(day)}
                    >
                      {day && (
                        <>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: isToday ? 600 : 400,
                              color: isToday ? 'primary.main' : 'text.primary',
                              mb: 1,
                            }}
                          >
                            {day.getDate()}
                          </Typography>
                          {dayEvents.map((event) => (
                            <Chip
                              key={event.id}
                              label={event.title}
                              size="small"
                              sx={{
                                backgroundColor: event.color,
                                color: 'white',
                                fontSize: '0.7rem',
                                height: 20,
                                mb: 0.5,
                                display: 'block',
                                '& .MuiChip-label': {
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                },
                              }}
                            />
                          ))}
                        </>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Upcoming Events
              </Typography>
              {events
                .filter(event => new Date(event.date) >= new Date())
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .slice(0, 5)
                .map((event) => (
                  <Box key={event.id} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: event.color,
                        }}
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {event.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(event.date).toLocaleDateString()} at {event.time}
                    </Typography>
                    <Chip
                      label={eventTypes.find(type => type.value === event.type)?.label}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Event Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Event</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Event Title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Event Type"
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                >
                  {eventTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: type.color,
                          }}
                        />
                        {type.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveEvent}
            variant="contained"
            disabled={!formData.title || !formData.date}
            sx={{
              background: 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)',
            }}
          >
            Add Event
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};