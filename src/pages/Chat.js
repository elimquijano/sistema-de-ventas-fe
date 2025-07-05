import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge,
  Divider,
  Paper,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  MoreVert as MoreVertIcon,
  Phone as PhoneIcon,
  VideoCall as VideoCallIcon,
} from '@mui/icons-material';

const mockContacts = [
  {
    id: 1,
    name: 'John Doe',
    avatar: 'JD',
    lastMessage: 'Hey, how are you doing?',
    time: '2 min ago',
    unread: 3,
    online: true,
  },
  {
    id: 2,
    name: 'Jane Smith',
    avatar: 'JS',
    lastMessage: 'The project looks great!',
    time: '1 hour ago',
    unread: 0,
    online: true,
  },
  {
    id: 3,
    name: 'Mike Johnson',
    avatar: 'MJ',
    lastMessage: 'Can we schedule a meeting?',
    time: '3 hours ago',
    unread: 1,
    online: false,
  },
  {
    id: 4,
    name: 'Sarah Wilson',
    avatar: 'SW',
    lastMessage: 'Thanks for your help!',
    time: '1 day ago',
    unread: 0,
    online: false,
  },
];

const mockMessages = [
  {
    id: 1,
    senderId: 1,
    message: 'Hey, how are you doing?',
    time: '10:30 AM',
    isOwn: false,
  },
  {
    id: 2,
    senderId: 'me',
    message: 'I\'m doing great! How about you?',
    time: '10:32 AM',
    isOwn: true,
  },
  {
    id: 3,
    senderId: 1,
    message: 'I\'m good too. Are we still on for the meeting tomorrow?',
    time: '10:35 AM',
    isOwn: false,
  },
  {
    id: 4,
    senderId: 'me',
    message: 'Yes, absolutely! Looking forward to it.',
    time: '10:36 AM',
    isOwn: true,
  },
];

export const Chat = () => {
  const [selectedContact, setSelectedContact] = useState(mockContacts[0]);
  const [messages, setMessages] = useState(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredContacts = mockContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        senderId: 'me',
        message: newMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwn: true,
      };
      setMessages([...messages, message]);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Chat
      </Typography>

      <Grid container spacing={3} sx={{ height: 'calc(100vh - 200px)' }}>
        {/* Contacts Sidebar */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ pb: 1 }}>
              <TextField
                fullWidth
                placeholder="Search contacts..."
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
                {filteredContacts.map((contact, index) => (
                  <React.Fragment key={contact.id}>
                    <ListItem
                      button
                      selected={selectedContact.id === contact.id}
                      onClick={() => setSelectedContact(contact)}
                      sx={{
                        '&.Mui-selected': {
                          backgroundColor: 'primary.light',
                          '&:hover': {
                            backgroundColor: 'primary.light',
                          },
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Badge
                          color="success"
                          variant="dot"
                          invisible={!contact.online}
                          anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                          }}
                        >
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {contact.avatar}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {contact.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {contact.time}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {contact.lastMessage}
                            </Typography>
                            {contact.unread > 0 && (
                              <Chip
                                label={contact.unread}
                                size="small"
                                color="primary"
                                sx={{ minWidth: 20, height: 20, fontSize: '0.75rem' }}
                              />
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < filteredContacts.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          </Card>
        </Grid>

        {/* Chat Area */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Chat Header */}
            <CardContent sx={{ borderBottom: 1, borderColor: 'divider', py: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Badge
                    color="success"
                    variant="dot"
                    invisible={!selectedContact.online}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                  >
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {selectedContact.avatar}
                    </Avatar>
                  </Badge>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {selectedContact.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedContact.online ? 'Online' : 'Last seen 2 hours ago'}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <IconButton>
                    <PhoneIcon />
                  </IconButton>
                  <IconButton>
                    <VideoCallIcon />
                  </IconButton>
                  <IconButton>
                    <MoreVertIcon />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>

            {/* Messages Area */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {messages.map((message) => (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    justifyContent: message.isOwn ? 'flex-end' : 'flex-start',
                    mb: 2,
                  }}
                >
                  <Paper
                    sx={{
                      p: 2,
                      maxWidth: '70%',
                      backgroundColor: message.isOwn ? 'primary.main' : 'grey.100',
                      color: message.isOwn ? 'white' : 'text.primary',
                    }}
                  >
                    <Typography variant="body2">{message.message}</Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 1,
                        opacity: 0.7,
                        textAlign: 'right',
                      }}
                    >
                      {message.time}
                    </Typography>
                  </Paper>
                </Box>
              ))}
            </Box>

            {/* Message Input */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <TextField
                fullWidth
                multiline
                maxRows={3}
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconButton size="small">
                        <AttachFileIcon />
                      </IconButton>
                      <IconButton size="small">
                        <EmojiIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        color="primary"
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                      >
                        <SendIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};