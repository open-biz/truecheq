# Environment Configuration for TruCheq

This file documents all required environment variables for the TruCheq application.

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# ============================================
# Cronos x402 Facilitator Configuration
# ============================================

# Your wallet address that will receive payments
NEXT_PUBLIC_SELLER_WALLET=0xYourWalletAddressHere

# Network: 'cronos-testnet' for testing, 'cronos' for production
NEXT_PUBLIC_CRONOS_NETWORK=cronos-testnet

# ============================================
# Filebase IPFS Storage Configuration
# ============================================

# Filebase S3 Access Credentials
FILEBASE_ACCESS_KEY=3C1833B178A67E9983A7
FILEBASE_SECRET_KEY=XFLTE7cdMY8sech2ysa9T75hRsf7MoREE7hbV9dC

# Filebase Bucket Name
NEXT_PUBLIC_FILEBASE_BUCKET=trucheq

# Filebase IPFS Gateway (your custom gateway)
NEXT_PUBLIC_FILEBASE_GATEWAY=parallel-pink-stork.myfilebase.com
```

## Setup Steps

### 1. Filebase Configuration

1. **Create Account**: Sign up at [filebase.com](https://filebase.com)
2. **Create Bucket**: Create a bucket named `trucheq` (or your preferred name)
3. **Get Credentials**: Navigate to Access Keys and create a new key
4. **Setup Gateway**: Go to Gateways and create a custom gateway for your bucket

### 2. Wallet Configuration

1. **Get Wallet Address**: Use your Cronos-compatible wallet address
2. **For Testing**: Use Cronos Testnet
3. **For Production**: Use Cronos Mainnet

### 3. Get Test Tokens (Testnet Only)

1. **TCRO Faucet**: https://cronos.org/faucet
2. **devUSDC.e Faucet**: https://faucet.cronos.org

## Network Details

### Cronos Testnet
- Chain ID: 338
- RPC: https://evm-t3.cronos.org
- Explorer: https://explorer.cronos.org/testnet
- USDC.e Contract: `0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0`

### Cronos Mainnet
- Chain ID: 25
- RPC: https://evm.cronos.org
- Explorer: https://explorer.cronos.org
- USDC.e Contract: `0xc21223249CA28397B4B6541dfFaEcC539BfF0c59`

## Security Notes

⚠️ **IMPORTANT**: Never commit `.env.local` to version control!

- The `.env.local` file is already in `.gitignore`
- Keep your `FILEBASE_SECRET_KEY` private
- Keep your wallet private keys secure (not stored in env)
- Use environment-specific wallets (test wallet for testnet)

## Verification

After setting up your `.env.local`, verify the configuration:

1. **Check Filebase Connection**:
   ```bash
   # The app will attempt to upload to Filebase when creating a deal
   # Check browser console for any upload errors
   ```

2. **Check Wallet Configuration**:
   ```bash
   # Ensure NEXT_PUBLIC_SELLER_WALLET is set correctly
   # This is where payments will be sent
   ```

3. **Test x402 Payment Flow**:
   - Create a deal with images
   - Open the deal link
   - Attempt to pay with USDC.e
   - Verify payment settlement

## Troubleshooting

### Filebase Upload Fails
- Verify `FILEBASE_ACCESS_KEY` and `FILEBASE_SECRET_KEY` are correct
- Check that bucket `trucheq` exists in your Filebase account
- Ensure bucket has proper permissions

### x402 Payment Fails
- Verify you have USDC.e tokens in your wallet
- Check that `NEXT_PUBLIC_SELLER_WALLET` is a valid address
- Ensure you're on the correct network (testnet vs mainnet)
- Check Facilitator status: https://facilitator.cronoslabs.org/healthcheck

### Images Not Loading
- Verify `NEXT_PUBLIC_FILEBASE_GATEWAY` is correct
- Check that gateway is active in Filebase dashboard
- Ensure images were uploaded successfully (check browser console)

## Additional Resources

- **Filebase Docs**: https://docs.filebase.com
- **Cronos x402 Docs**: https://docs.cronos.org/cronos-x402-facilitator
- **Facilitator API**: https://facilitator.cronoslabs.org/v2/x402
- **TruCheq Docs**: See README-FILEBASE.md and README-X402.md
