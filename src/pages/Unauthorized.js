import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  useTheme,
} from '@mui/material';
import { Lock, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export const Unauthorized = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 500,
          width: '100%',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          textAlign: 'center',
        }}
      >
        <CardContent sx={{ p: 6 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <Lock sx={{ fontSize: 40, color: 'white' }} />
          </Box>
          
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: '#ff6b6b' }}>
            403
          </Typography>
          
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            Access Denied
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            You don't have permission to access this resource. Please contact your administrator if you believe this is an error.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate(-1)}
              sx={{
                borderColor: '#673ab7',
                color: '#673ab7',
                '&:hover': {
                  borderColor: '#673ab7',
                  backgroundColor: 'rgba(103, 58, 183, 0.04)',
                },
              }}
            >
              Go Back
            </Button>
            
            <Button
              variant="contained"
              onClick={() => navigate('/dashboard')}
              sx={{
                background: 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5e35b1 0%, #8e24aa 100%)',
                },
              }}
            >
              Go to Dashboard
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};