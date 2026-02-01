# Deploying the FarmbotOpsToken (draft)

MVP stance: deploy to an EVM L2 **testnet** first.

Suggested parameters:
- farm area: 242,800 m²
- mapping: 1,000 tokens = 1 m²
- max supply: 242,800,000 tokens (decimals=0)

You will need:
- RPC URL
- deployer private key

Then add the deployed token address to the platform `.env`:
- TOKEN_CHAIN_ID
- TOKEN_RPC_URL
- TOKEN_ADDRESS
