import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Person as PersonIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const Settings = () => {
  const [tabValue, setTabValue] = useState(0);
  const [profileData, setProfileData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1 234 567 8900',
    company: 'Berry Inc.',
    position: 'Administrator',
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: true,
    marketingEmails: false,
  });

  const [preferences, setPreferences] = useState({
    darkMode: false,
    language: 'en',
    timezone: 'UTC-5',
    dateFormat: 'MM/DD/YYYY',
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (field, value) => {
    setNotifications(prev => ({ ...prev, [field]: value }));
  };

  const tabs = [
    { label: 'Profile', icon: <PersonIcon /> },
    { label: 'Security', icon: <SecurityIcon /> },
    { label: 'Notifications', icon: <NotificationsIcon /> },
    { label: 'Preferences', icon: <PaletteIcon /> },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Tabs
                orientation="vertical"
                variant="scrollable"
                value={tabValue}
                onChange={handleTabChange}
                sx={{ borderRight: 1, borderColor: 'divider' }}
              >
                {tabs.map((tab, index) => (
                  <Tab
                    key={index}
                    label={tab.label}
                    icon={tab.icon}
                    iconPosition="start"
                    sx={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      minHeight: 48,
                    }}
                  />
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={9}>
          <Card>
            <CardContent>
              {/* Profile Tab */}
              <TabPanel value={tabValue} index={0}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Profile Information
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      mr: 3,
                      bgcolor: 'primary.main',
                      fontSize: '2rem',
                    }}
                  >
                    {profileData.firstName.charAt(0)}{profileData.lastName.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {profileData.firstName} {profileData.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {profileData.position} at {profileData.company}
                    </Typography>
                    <Chip label="Administrator" color="primary" size="small" sx={{ mt: 1 }} />
                  </Box>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={profileData.firstName}
                      onChange={(e) => handleProfileChange('firstName', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={profileData.lastName}
                      onChange={(e) => handleProfileChange('lastName', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={profileData.phone}
                      onChange={(e) => handleProfileChange('phone', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Company"
                      value={profileData.company}
                      onChange={(e) => handleProfileChange('company', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Position"
                      value={profileData.position}
                      onChange={(e) => handleProfileChange('position', e.target.value)}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <Button variant="contained">Save Changes</Button>
                  <Button variant="outlined" sx={{ ml: 2 }}>Cancel</Button>
                </Box>
              </TabPanel>

              {/* Security Tab */}
              <TabPanel value={tabValue} index={1}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Security Settings
                </Typography>

                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Change Password
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Current Password"
                        type="password"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="New Password"
                        type="password"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Confirm New Password"
                        type="password"
                      />
                    </Grid>
                  </Grid>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    Update Password
                  </Button>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  Two-Factor Authentication
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Switch />
                  <Typography sx={{ ml: 2 }}>
                    Enable two-factor authentication for enhanced security
                  </Typography>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  Active Sessions
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Current Session"
                      secondary="Chrome on Windows • New York, NY"
                    />
                    <ListItemSecondaryAction>
                      <Chip label="Active" color="success" size="small" />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Mobile App"
                      secondary="iPhone • Last active 2 hours ago"
                    />
                    <ListItemSecondaryAction>
                      <Button size="small" color="error">Revoke</Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </TabPanel>

              {/* Notifications Tab */}
              <TabPanel value={tabValue} index={2}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Notification Preferences
                </Typography>

                <List>
                  <ListItem>
                    <ListItemText
                      primary="Email Notifications"
                      secondary="Receive notifications via email"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={notifications.emailNotifications}
                        onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="Push Notifications"
                      secondary="Receive push notifications in your browser"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={notifications.pushNotifications}
                        onChange={(e) => handleNotificationChange('pushNotifications', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="SMS Notifications"
                      secondary="Receive important updates via SMS"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={notifications.smsNotifications}
                        onChange={(e) => handleNotificationChange('smsNotifications', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="Marketing Emails"
                      secondary="Receive marketing and promotional emails"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={notifications.marketingEmails}
                        onChange={(e) => handleNotificationChange('marketingEmails', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </TabPanel>

              {/* Preferences Tab */}
              <TabPanel value={tabValue} index={3}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Application Preferences
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          Dark Mode
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Switch between light and dark themes
                        </Typography>
                      </Box>
                      <Switch
                        checked={preferences.darkMode}
                        onChange={(e) => setPreferences(prev => ({ ...prev, darkMode: e.target.checked }))}
                      />
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Language"
                      value={preferences.language}
                      onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                      select
                      SelectProps={{ native: true }}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </TextField>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Timezone"
                      value={preferences.timezone}
                      onChange={(e) => setPreferences(prev => ({ ...prev, timezone: e.target.value }))}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Date Format"
                      value={preferences.dateFormat}
                      onChange={(e) => setPreferences(prev => ({ ...prev, dateFormat: e.target.value }))}
                      select
                      SelectProps={{ native: true }}
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </TextField>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <Button variant="contained">Save Preferences</Button>
                  <Button variant="outlined" sx={{ ml: 2 }}>Reset to Default</Button>
                </Box>
              </TabPanel>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};