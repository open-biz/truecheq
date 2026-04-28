'use client';

import { useEffect } from 'react';

export default function AppPage() {
  useEffect(() => {
    window.location.href = '/';
  }, []);

  return null;
}
