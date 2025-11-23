import React, { useState } from 'react'; 
import { TextField, Button, Box, Typography, Divider } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import useZustandStore from '../../zustandStore';
import { loginUser, registerUser } from '../../api';

function LoginRegister() {
  // LOGIN STATE
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // REGISTER STATE
  const [regData, setRegData] = useState({
    login_name: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
    location: '',
    description: '',
    occupation: '',
  });
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');

  const navigate = useNavigate();
  const setCurrentUser = useZustandStore((state) => state.setCurrentUser);

  // -----------------------------------
  // LOGIN MUTATION
  // -----------------------------------
  const loginMutation = useMutation({
    mutationFn: ({ login_name, password }) => loginUser({ login_name, password }),   // ✅ FIXED
    onSuccess: (data) => {
      setLoginError('');
      setCurrentUser(data);
      navigate(`/users/${data._id}`);
    },
    onError: () => {
      setLoginError('Invalid login name or password');
    },
  });

  const handleLogin = () => {
    if (!loginName.trim() || !loginPassword.trim()) return;

    loginMutation.mutate({
      login_name: loginName.trim(),
      password: loginPassword.trim(),
    });
  };

  // -----------------------------------
  // REGISTRATION MUTATION
  // -----------------------------------
  const registerMutation = useMutation({
    mutationFn: (body) => registerUser(body),
    onSuccess: () => {
      setRegisterError('');
      setRegisterSuccess('Registration successful! You may now log in.');

      // reset register form
      setRegData({
        login_name: '',
        password: '',
        password2: '',
        first_name: '',
        last_name: '',
        location: '',
        description: '',
        occupation: '',
      });
    },
    onError: (err) => {
      setRegisterSuccess('');
      setRegisterError(
        err?.response?.data || 'Registration failed. Check your input.'
      );
    },
  });

  const handleRegister = () => {
    const { login_name, password, password2, first_name, last_name } = regData;

    if (!login_name || !password || !first_name || !last_name) {
      setRegisterError('Required fields cannot be empty.');
      return;
    }
    if (password !== password2) {
      setRegisterError('Passwords do not match.');
      return;
    }

    registerMutation.mutate(regData);
  };

  return (
    <Box sx={{ maxWidth: 350, margin: '2rem auto' }}>
      
      {/* LOGIN SECTION */}
      <Typography variant="h6" textAlign="center" gutterBottom>
        Please Login
      </Typography>

      <TextField
        label="Login Name"
        variant="outlined"
        fullWidth
        margin="normal"
        value={loginName}
        onChange={(e) => setLoginName(e.target.value)}
      />

      <TextField
        label="Password"
        type="password"
        variant="outlined"
        fullWidth
        margin="normal"
        value={loginPassword}
        onChange={(e) => setLoginPassword(e.target.value)}
      />

      {loginError && (
        <Typography color="error" variant="body2">
          {loginError}
        </Typography>
      )}

      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
        disabled={loginMutation.isPending}
        onClick={handleLogin}
      >
        {loginMutation.isPending ? 'Logging in...' : 'Login'}
      </Button>

      <Divider sx={{ my: 4 }} />

      {/* REGISTRATION SECTION */}
      <Typography variant="h6" textAlign="center" gutterBottom>
        Register New User
      </Typography>

      {registerError && (
        <Typography color="error" variant="body2" sx={{ mb: 1 }}>
          {registerError}
        </Typography>
      )}

      {registerSuccess && (
        <Typography color="success.main" variant="body2" sx={{ mb: 1 }}>
          {registerSuccess}
        </Typography>
      )}

      {/* REQUIRED FIELDS */}
      <TextField
        label="Login Name (required)"
        fullWidth
        margin="dense"
        value={regData.login_name}
        onChange={(e) => setRegData((d) => ({ ...d, login_name: e.target.value }))}
      />
      <TextField
        label="First Name (required)"
        fullWidth
        margin="dense"
        value={regData.first_name}
        onChange={(e) => setRegData((d) => ({ ...d, first_name: e.target.value }))}
      />
      <TextField
        label="Last Name (required)"
        fullWidth
        margin="dense"
        value={regData.last_name}
        onChange={(e) => setRegData((d) => ({ ...d, last_name: e.target.value }))}
      />

      {/* OPTIONAL FIELDS */}
      <TextField
        label="Location"
        fullWidth
        margin="dense"
        value={regData.location}
        onChange={(e) => setRegData((d) => ({ ...d, location: e.target.value }))}
      />
      <TextField
        label="Description"
        fullWidth
        margin="dense"
        value={regData.description}
        onChange={(e) => setRegData((d) => ({ ...d, description: e.target.value }))}
      />
      <TextField
        label="Occupation"
        fullWidth
        margin="dense"
        value={regData.occupation}
        onChange={(e) => setRegData((d) => ({ ...d, occupation: e.target.value }))}
      />

      {/* PASSWORD FIELDS */}
      <TextField
        label="Password (required)"
        type="password"
        fullWidth
        margin="dense"
        value={regData.password}
        onChange={(e) => setRegData((d) => ({ ...d, password: e.target.value }))}
      />

      <TextField
        label="Re-enter Password"
        type="password"
        fullWidth
        margin="dense"
        value={regData.password2}
        onChange={(e) => setRegData((d) => ({ ...d, password2: e.target.value }))}
      />

      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
        disabled={registerMutation.isPending}
        onClick={handleRegister}
      >
        {registerMutation.isPending ? 'Registering...' : 'Register Me'}
      </Button>
    </Box>
  );
}

export default LoginRegister;