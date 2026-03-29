import { paymentMiddleware } from 'x402-next';

const PAY_TO = (process.env.NEXT_PUBLIC_X402_PAY_TO || '0x0000000000000000000000000000000000000001') as `0x${string}`;

export const middleware = paymentMiddleware(
  PAY_TO,
  {
    '/pay/:path*': {
      price: '$0.01',
      network: 'base-sepolia',
      config: {
        description: 'TruCheq — Verified P2P Commerce Payment',
      },
    },
  }
);

export const config = {
  matcher: '/pay/:path*',
};
