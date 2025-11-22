import React, { useState } from 'react';
import { TextField, Button, Box, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import useZustandStore from '../../zustandStore';
import { loginUser } from '../../api';

function LoginRegister() {
  const [loginName, setLoginName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const setCurrentUser = useZustandStore((state) => state.setCurrentUser);

  const loginMutation = useMutation({
    mutationFn: (name) => loginUser(name),
    onSuccess: (data) => {
      setError('');
      // Store user in Zustand
      setCurrentUser(data);
      // Navigate to user's detail page
      navigate(`/users/${data._id}`);
    },
    onError: (err) => {
      setError('Login failed: Invalid login name');
      console.error('Login error:', err);
    },
  });

  const handleLogin = () => {
    if (!loginName.trim()) return;
    loginMutation.mutate(loginName.trim());
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <Box sx={{ maxWidth: 300, margin: '2rem auto', textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>
        Please Login
      </Typography>

      <TextField
        label="Login Name"
        variant="outlined"
        fullWidth
        value={loginName}
        onChange={(e) => setLoginName(e.target.value)}
        onKeyPress={handleKeyPress}
        margin="normal"
        error={!!error}
        helperText={error}
        autoFocus
      />

      <Button
        variant="contained"
        fullWidth
        onClick={handleLogin}
        disabled={!loginName.trim() || loginMutation.isPending}
        sx={{ mt: 2 }}
      >
        {loginMutation.isPending ? 'Logging in...' : 'Login'}
      </Button>
    </Box>
  );
}