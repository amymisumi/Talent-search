import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const NetworkPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard with network tab active
    navigate('/youth/dashboard?tab=network', { replace: true });
  }, [navigate]);

  return null;
};

export default NetworkPage;
