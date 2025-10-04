import React from 'react';
import { Box, Container } from '@mui/material';
import VoucherListPage from '../components/vouchers/VoucherListPage';

function VouchersPage() {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <VoucherListPage />
      </Box>
    </Container>
  );
}

export default VouchersPage;