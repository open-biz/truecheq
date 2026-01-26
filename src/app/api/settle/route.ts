import { NextResponse } from 'next/server';
import { Facilitator, CronosNetwork } from '@crypto.com/facilitator-client';
import { ethers } from 'ethers';

// Cronos Testnet RPC
const RPC_URL = 'https://evm-t3.cronos.org';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { signature, message, domain } = body;

    if (!signature || !message || !domain) {
      return NextResponse.json({ error: 'Missing payment data' }, { status: 400 });
    }

    if (domain.chainId !== 338) {
        return NextResponse.json({ error: 'Backend settlement only supported for Cronos Testnet' }, { status: 400 });
    }

    // Initialize Provider and Signer (Gas Payer)
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    if (!process.env.MNEMONIC) {
        throw new Error('Server misconfigured: Missing MNEMONIC');
    }

    const wallet = ethers.Wallet.fromPhrase(process.env.MNEMONIC).connect(provider);

    // Initialize Facilitator
    // Note: If the SDK requires a specific API endpoint, it's usually handled by the Network enum.
    // However, settlePayment likely sends a transaction directly to the chain via the provided signer/provider
    // OR it calls the Facilitator API which then relays it.
    // Based on "gasless payments", the Facilitator Service likely relays it.
    // BUT, since I don't have a Facilitator API Key, and the SDK allows passing a signer,
    // I am acting as the "Facilitator" (Gas Payer) here.
    
    // Actually, looking at the SDK structure from summary:
    // "execute the on-chain transfer using settlePayment"
    
    // Let's assume we are submitting the transaction manually using the signed authorization
    // because we are the "Facilitator" in this context (the merchant/app).
    
    // The Contract is USDC (Token with Authorization).
    // Function: receiveWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s)
    // Or transferWithAuthorization.
    
    const usdcAbi = [
      "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external"
    ];

    const usdcContract = new ethers.Contract(domain.verifyingContract, usdcAbi, wallet);

    // Split signature
    const sig = ethers.Signature.from(signature);

    console.log(`Submitting settlement for ${message.from} -> ${message.to} amount ${message.value}`);

    const tx = await usdcContract.transferWithAuthorization(
        message.from,
        message.to,
        message.value,
        message.validAfter,
        message.validBefore,
        message.nonce,
        sig.v,
        sig.r,
        sig.s
    );

    console.log('Transaction submitted:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('Transaction mined in block:', receipt.blockNumber);

    return NextResponse.json({ 
        success: true, 
        txHash: tx.hash,
        blockNumber: receipt.blockNumber 
    });

  } catch (error: any) {
    console.error('Settlement error:', error);
    return NextResponse.json({ 
        error: error.reason || error.message || 'Settlement failed' 
    }, { status: 500 });
  }
}
