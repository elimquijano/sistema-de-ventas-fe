import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  Divider,
  Paper,
} from '@mui/material';
import {
  Inbox as InboxIcon,
  Send as SendIcon,
  Drafts as DraftsIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Archive as ArchiveIcon,
  Reply as ReplyIcon,
  Forward as ForwardIcon,
  MoreVert as MoreVertIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';

const mockFolders = [
  { id: 'inbox', name: 'Inbox', icon: <InboxIcon />, count: 12 },
  { id: 'sent', name: 'Sent', icon: <SendIcon />, count: 0 },
  { id: 'drafts', name: 'Drafts', icon: <DraftsIcon />, count: 3 },
  { id: 'trash', name: 'Trash', icon: <DeleteIcon />, count: 5 },
];

const mockEmails = [
  {
    id: 1,
    from: 'John Doe',
    email: 'john@example.com',
    subject: 'Project Update - Q1 2024',
    preview: 'Hi team, I wanted to share the latest updates on our Q1 project...',
    time: '10:30 AM',
    read: false,
    starred: true,
    important: true,
    avatar: 'JD',
  },
  {
    id: 2,
    from: 'Jane Smith',
    email: 'jane@example.com',
    subject: 'Meeting Reminder',
    preview: 'Don\'t forget about our meeting tomorrow at 2 PM...',
    time: '9:15 AM',
    read: true,
    starred: false,
    important: false,
    avatar: 'JS',
  },
  {
    id: 3,
    from: 'Mike Johnson',
    email: 'mike@example.com',
    subject: 'Code Review Request',
    preview: 'Could you please review the latest changes in the feature branch...',
    time: 'Yesterday',
    read: false,
    starred: false,
    important: true,
    avatar: 'MJ',
  },
  {
    id: 4,
    from: 'Sarah Wilson',
    email: 'sarah@example.com',
    subject: 'Design Feedback',
    preview: 'I\'ve reviewed the new designs and have some feedback...',
    time: 'Yesterday',
    read: true,
    starred: true,
    important: false,
    avatar: 'SW',
  },
];

export const Mail = () => {
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(mockEmails[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [emails, setEmails] = useState(mockEmails);

  const filteredEmails = emails.filter(email =>
    email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.preview.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectEmail = (emailId) => {
    setSelectedEmails(prev =>
      prev.includes(emailId)
        ? prev.filter(id => id !== emailId)
        : [...prev, emailId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEmails.length === filteredEmails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(filteredEmails.map(email => email.id));
    }
  };

  const handleStarEmail = (emailId) => {
    setEmails(prev => prev.map(email =>
      email.id === emailId ? { ...email, starred: !email.starred } : email
    ));
  };

  const handleMarkAsRead = (emailId) => {
    setEmails(prev => prev.map(email =>
      email.id === emailId ? { ...email, read: true } : email
    ));
  };

  const handleDeleteEmails = () => {
    setEmails(prev => prev.filter(email => !selectedEmails.includes(email.id)));
    setSelectedEmails([]);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Mail
      </Typography>

      <Grid container spacing={3} sx={{ height: 'calc(100vh - 200px)' }}>
        {/* Sidebar */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Button
                variant="contained"
                fullWidth
                startIcon={<SendIcon />}
                sx={{
                  mb: 3,
                  background: 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)',
                }}
              >
                Compose
              </Button>
              
              <List>
                {mockFolders.map((folder) => (
                  <ListItem
                    key={folder.id}
                    button
                    selected={selectedFolder === folder.id}
                    onClick={() => setSelectedFolder(folder.id)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      '&.Mui-selected': {
                        backgroundColor: 'primary.light',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {folder.icon}
                    </ListItemIcon>
                    <ListItemText primary={folder.name} />
                    {folder.count > 0 && (
                      <Chip
                        label={folder.count}
                        size="small"
                        color="primary"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Email List */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Checkbox
                  checked={selectedEmails.length === filteredEmails.length && filteredEmails.length > 0}
                  indeterminate={selectedEmails.length > 0 && selectedEmails.length < filteredEmails.length}
                  onChange={handleSelectAll}
                />
                <IconButton size="small">
                  <RefreshIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleDeleteEmails}
                  disabled={selectedEmails.length === 0}
                >
                  <DeleteIcon />
                </IconButton>
                <IconButton size="small" disabled={selectedEmails.length === 0}>
                  <ArchiveIcon />
                </IconButton>
              </Box>
              
              <TextField
                fullWidth
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </CardContent>
            
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <List sx={{ p: 0 }}>
                {filteredEmails.map((email, index) => (
                  <React.Fragment key={email.id}>
                    <ListItem
                      button
                      selected={selectedEmail.id === email.id}
                      onClick={() => {
                        setSelectedEmail(email);
                        handleMarkAsRead(email.id);
                      }}
                      sx={{
                        py: 2,
                        backgroundColor: !email.read ? 'action.hover' : 'transparent',
                        '&.Mui-selected': {
                          backgroundColor: 'primary.light',
                          '&:hover': {
                            backgroundColor: 'primary.light',
                          },
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 1 }}>
                        <Checkbox
                          checked={selectedEmails.includes(email.id)}
                          onChange={() => handleSelectEmail(email.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          {email.avatar}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: !email.read ? 600 : 400,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                              }}
                            >
                              {email.from}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {email.time}
                            </Typography>
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: !email.read ? 600 : 400,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              mb: 0.5,
                            }}
                          >
                            {email.subject}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {email.preview}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStarEmail(email.id);
                          }}
                        >
                          {email.starred ? <StarIcon color="warning" /> : <StarBorderIcon />}
                        </IconButton>
                      </Box>
                    </ListItem>
                    {index < filteredEmails.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          </Card>
        </Grid>

        {/* Email Content */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {selectedEmail && (
              <>
                <CardContent sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                      {selectedEmail.subject}
                    </Typography>
                    <Box>
                      <IconButton size="small">
                        <ReplyIcon />
                      </IconButton>
                      <IconButton size="small">
                        <ForwardIcon />
                      </IconButton>
                      <IconButton size="small">
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {selectedEmail.avatar}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {selectedEmail.from}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedEmail.email}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {selectedEmail.time}
                    </Typography>
                  </Box>
                </CardContent>
                
                <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
                  <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                    Hi there,
                    <br /><br />
                    {selectedEmail.preview}
                    <br /><br />
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                    <br /><br />
                    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                    <br /><br />
                    Best regards,<br />
                    {selectedEmail.from}
                  </Typography>
                  
                  {selectedEmail.id === 1 && (
                    <Paper sx={{ p: 2, mt: 3, backgroundColor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <AttachFileIcon fontSize="small" />
                        <Typography variant="subtitle2">Attachments</Typography>
                      </Box>
                      <Typography variant="body2" color="primary" sx={{ cursor: 'pointer' }}>
                        project-report-q1.pdf (2.3 MB)
                      </Typography>
                    </Paper>
                  )}
                </Box>
                
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Reply to this email..."
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton color="primary">
                            <SendIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};