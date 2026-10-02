# WIF — the wif hat launchpad

Upload any image → **Convert** → it becomes the next dogwifhat → launch it on pump.fun from your own wallet.

## Deploy on Vercel
1. Import this repo in Vercel. Framework preset: **Other**. No build command.
2. Add these environment variables (Settings → Environment Variables), then redeploy:

| Variable | Required | What it is |
|---|---|---|
| `FAL_KEY` | yes, for AI convert | fal.ai → Dashboard → API keys. Without it the site falls back to the hat overlay. |
| `SOLANA_RPC_URL` | yes, recommended | Mainnet RPC URL, e.g. free Helius: `https://mainnet.helius-rpc.com/?api-key=...` |
| `PINATA_JWT` | optional backup | Pinata → API Keys → JWT. Used only if pump.fun's image upload is down. |
| `FAL_MODEL` | optional | Default `fal-ai/nano-banana/edit`. |
| `CONVERT_LIMIT_PER_HOUR` | optional | AI conversions per IP per hour, default 12. |
| `PRIORITY_FEE_SOL` | optional | Default 0.0005. |

The header badge says **AI converter live** once `FAL_KEY` is set.

## How a launch works
1. `/api/ipfs` uploads the image + name/ticker/links to pump.fun's IPFS (Pinata as backup).
2. `/api/create-tx` asks PumpPortal for the create + dev-buy transaction.
3. The browser makes a fresh mint keypair, the user's Phantom signs, then the mint signs.
4. `/api/send` submits it through your RPC and waits for confirmation.

No private keys ever reach the server. PumpPortal takes a 0.5% fee on the dev buy.

## Brand assets
`/brand` has the logo, hat icon, X avatar and X header.
