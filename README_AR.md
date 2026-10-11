# MAFIA RAWR — Netlify multiplayer starter

## What this project includes
- Arabic mobile-friendly game interface.
- Create/join room by code.
- Secret role display (only returned to that player's browser).
- Night action, day vote, host phase control.
- Netlify Function API and Netlify Blobs room storage.

## Important deployment note
This project requires a **Netlify site connected to a Git repository** so Netlify can deploy the `netlify/functions` backend. Uploading only `index.html` through Netlify Drop will NOT deploy the backend functions.

## Deploy from a phone
1. Create a GitHub account if you do not have one.
2. Create a new repository and upload all files/folders from this project, keeping the folder path `netlify/functions/game.mjs`.
3. In Netlify, choose **Add new site → Import an existing project**, connect GitHub, and select the repository.
4. Keep the build settings from `netlify.toml`; deploy.
5. Open the generated Netlify site URL on multiple phones and test with at least 4 players.

Netlify Blobs is used for room state. Netlify enables Blobs for deployed functions. No Firebase configuration is required.

## Game limitations in this starter
This is a working multiplayer starter, not a production-secure competitive game. The room API uses player tokens but does not implement accounts, robust anti-cheat, disconnect cleanup, role-specific special abilities, or protection against a malicious person calling the API directly. Test privately before sharing widely. The current role set is Mafia and Citizen; the night phase supports the Mafia target action and the day phase supports voting.
