'use client';

import { useEffect } from 'react';

export default function MarketplacePage() {
  useEffect(() => {
    window.location.href = '/?tab=buy';
  }, []);

  return null;
}
