Scout API Demo App

**Run app**

1. `npm install`
2. Create `.env` file with
```
CLIENT_ID=YOUR_CLIENT_ID
CLIENT_SECRET=YOUR_CLIENT_SECRET
```
3. `npm start`


**To authenticate**

Replace  `CLIENT_ID` with your `client_id`.

Replace  `CLIENT_SECRET` with your `client_secret`.

CURL code example:
```
curl -X POST \
  https://supermax-dev.auth0.com/oauth/token \
  -H 'Content-Type: application/json' \
  -H 'cache-control: no-cache' \
  -d '{
    "audience": "aragon_api",
    "grant_type": "client_credentials",
    "client_id": "CLIENT_ID",
    "client_secret": "CLIENT_SECRET"
  }'
```
