require("dotenv").config();

const express = require("express");
const session = require("express-session");

const apiHelper = require("./APIHelper");

const app = express();
const port = 3000;

app.use(
  session({
    secret: "mytopsecret",
    resave: false,
    saveUninitialized: false,
    tokenType: null,
    accessToken: null
  })
);

app.get("/", (req, res) => {
  let sessData = req.session;

  res.send(`<h1>Welcome to Scout example Client</h1>
  <p>${req.query.m ? "Message: " + decodeURIComponent(req.query.m) : ""}</p>
  <p>Current token:</p>
  <textarea cols="150" rows="8">${
    sessData.accessToken
      ? sessData.tokenType + " " + sessData.accessToken
      : "No token available"
  }</textarea>
  <p>Token life: ${sessData.expiresIn ? sessData.expiresIn / 1000 / 60 + ' minutes' : ''}</p>
  <p>It expires at: ${sessData.expiresAt ? new Date(sessData.expiresAt) : ''}</p>
  <hr />
  <p>Follow these links to test different endpoints:</p>
  <ul>
      <li>Request Token: <a href="/requestToken">/requestToken</a></li>
      <li>Remove Token: <a href="/removeToken">/removeToken</a></li>
      <li>Get Transactions: <a href="/getTxs">/getTxs</a></li>
      <li>Get Transactions (Auto-request Token if not present): <a href="/getTxs?checkAuth=yes">/getTxs?checkAuth=yes</a></li>
    </ul>`);
});

/**
 *
 */
app.get("/requestToken", async (req, res) => {
  try {
    await checkAuth(req);
    res.redirect("/?m=" + encodeURIComponent("Token retrieved successfully!"));
  } catch (e) {
    res.redirect("/?m=" + encodeURIComponent("Token retrieval failed: " + e));
  }
});

/**
 *
 */
app.get("/removeToken", async (req, res) => {
  let sessData = req.session;
  sessData.tokenType = null;
  sessData.accessToken = null;
  sessData.expiresIn = null;
  sessData.expiresAt = null;

  res.redirect("/?m=" + encodeURIComponent("Token has been removed"));
});

/**
 * Call transactions endpoint
 */
app.get("/getTxs", async (req, res) => {
  try {
    // Check auth
    if (req.query.checkAuth === "yes") {
      await checkAuth(req);
    }
    let sessData = req.session;

    const bodyData = {
      // Example form data. Refer to API docs for more information.
      contracts: [
        "0x658A4e5B1B7F1AF79aE2bDecF4368923b4419d4e",
        "0x98cCF213f6EA473A9E30Ae224D1C2287DA2d394f",
        "0x38da6AC44200551b75e20451F2e6d9f7175086B5",
        "0xFACb1F7E9d2d3481467Ffa05168882dc41Fe7468",
        "0x635193983512c621E6a3E15ee1dbF36f0C0Db8E0"
      ],
      functions: ["vote"],
      status: true,
      block: {
        field: "blockNumber",
        from: 7822401,
        to: 7840633
      }
    };

    const header = sessData.accessToken ? {
      authorization: `${sessData.tokenType} ${sessData.accessToken}`
    } : {}

    apiHelper
      .callAPI(
        "https://scout-stage-app.herokuapp.com/supermax/api/v2/txsauth/aragon/mainnet",
        "POST",
        header,
        bodyData
      )
      .then(body => {
        res.send(`<h2>TXs endpoint</h2> 
                  <p>Calling Scout's TXs endpoint returned: </p>
                  <textarea cols="150" rows="8">${JSON.stringify(
                    body
                  )}</textarea>
                  <p>The authorization header sent is:</p>
                  <textarea cols="150" rows="8">${JSON.stringify(header)}</textarea>`);
      })
      .catch(error => {
        res.send(error);
      });
  } catch (e) {
    res.send(e);
  }
});

/**
 * Check if there is a non expired token, get a new one if expired and finally call endpoint
 * sending token in authorization header
 */
app.get("/testAuth", async (req, res) => {
  try {
    // Check auth
    await checkAuth(req);

    let sessData = req.session;

    // Use token to call Scout's endpoint
    // Use access token to authenticate on endpoint
    apiHelper
      .callAPI(
        "https://scout-stage-app.herokuapp.com/supermax/api/v2/dummyauth/aragon",
        "GET",
        {
          authorization: `${sessData.tokenType} ${sessData.accessToken}`
        },
        {}
      )
      .then(body => {
        res.send(`<h2>Auth Test</h2> 
                  <p>AccessToken retrieved successfully!</p>
                  <p>Calling Scout's endpoint returned:</p>
                  <textarea cols="50" rows="2"> ${JSON.stringify(body)}
                  </textarea>
                  <p>The authorization header sent is:</p>
                  <textarea cols="150" rows="8">authorization: ${
                    sessData.tokenType
                  } ${sessData.accessToken}</textarea>
        <p>Token life: ${sessData.expiresIn / 1000 / 60} minutes</p>
        <p>It expires at: ${new Date(sessData.expiresAt)}</p>`);
      })
      .catch(error => {
        res.send(error);
      });
  } catch (e) {
    res.send(e);
  }
});

app.listen(port, () => console.log(`App listening on port ${port}!`));

/**
 * Checks for valid auth data
 */
const checkAuth = async req => {
  // Check if there is a non expired token
  let sessData = req.session;

  // This may still send an expired token to API putting into account cpu time and network latency
  // You may want to add a few millis to avoid this
  if (
    !sessData.expiresAt ||
    (sessData.expiresAt && new Date().getTime() >= sessData.expiresAt)
  ) {
    // Time to renew token
    const token = await getAccessToken();

    // Store accessToken somewhere. We are going to use session in this case.
    sessData.tokenType = token.token_type;
    sessData.accessToken = token.access_token;

    sessData.expiresIn = token.expires_in * 1000;
    // Save expiration time. Auth0 will tell us the remaining time to expiration, so just add it to current timestamp
    sessData.expiresAt = new Date().getTime() + sessData.expiresIn;
  }
};

/**
 * Get access token from Auth0's service
 */
const getAccessToken = async () => {
  // Auth0 Credentials - Store in a SAFE place. DO NOT push to repo
  // **************************
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;
  // **************************

  const headers = {
    "cache-control": "no-cache",
    "content-type": "application/json"
  };

  // Authorization request body
  const body = {
    audience: "aragon_api",
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret
  };

  // Get access token
  return apiHelper.callAPI(
    "https://supermax-dev.auth0.com/oauth/token",
    "POST",
    headers,
    body
  );
};
