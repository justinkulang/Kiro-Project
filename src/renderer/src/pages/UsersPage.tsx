import React from 'react';
import { Box, Container } from '@mui/material';
import UserListPage from '../components/users/UserListPage';

function UsersPage() {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <UserListPage />
      </Box>
    </Container>
  );
}

export default UsersPage;