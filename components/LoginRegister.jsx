import React, { useState } from 'react';
import { TextField, Button, Box, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { loginUser } from '../../api';  // <-- import here

function LoginRegister({ onLoginSuccess }) {
  const [loginName, setLoginName] = useState('');
  const [error, setError] = useState('');

  const loginMutation = useMutation(loginUser, {
    onSuccess: (data) => {
      setError('');
      onLoginSuccess(data);
    },
    onError: () => {
      setError('Login failed: Invalid login name');
    },
  });

  const handleLogin = () => {
    loginMutation.mutate(loginName.trim());
  };

  return (
    <Box sx={{ maxWidth: 300, margin: '2rem auto', textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>
        Login
      </Typography>

      <TextField
        label="Login Name"
        variant="outlined"
        fullWidth
        value={loginName}
        onChange={(e) => setLoginName(e.target.value)}
        margin="normal"
      />

      {error && (
        <Typography color="error" variant="body2" gutterBottom>
          {error}
        </Typography>
      )}

      <Button
        variant="contained"
        fullWidth
        onClick={handleLogin}
        disabled={!loginName.trim() || loginMutation.isLoading}
      >
        {loginMutation.isLoading ? 'Logging in...' : 'Login'}
      </Button>
    </Box>
  );
}

export default LoginRegister;
