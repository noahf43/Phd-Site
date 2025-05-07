// AWS Cognito 
const awsjwt = require('aws-jwt-verify');
// Pull in axios Library for HTTPS Requests to Cognito
const axios = require('axios');
// Constants
//import {DOMAIN,POOL,URI,CLIENT,SECRET} from './consts.js'
const CONSTS = require('./consts.js');

// Functions 
// Should only be called on the "/Login" Page. Then we store the auth token in a cookie, we should set this to expire in 1 hr as the token expires at that time
// https://docs.aws.amazon.com/cognito/latest/developerguide/token-endpoint.ejs
// https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.ejd
// https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.ejs
async function getToken(authCode) {
    // Format Request Parameters
    const data = new URLSearchParams();
    data.append("grant_type", "authorization_code");
    data.append("client_id", CONSTS.CLIENT);
    data.append("code", authCode);
    data.append("redirect_uri", CONSTS.URI);
    const credentials = `${CONSTS.CLIENT}:${CONSTS.SECRET}`;
    const base64Credentials = Buffer.from(credentials).toString("base64");
    const basicAuthorization = `Basic ${base64Credentials}`;
    const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": basicAuthorization
      };
    
    // Send POST request and await response
    const response = await axios.post(`${CONSTS.DOMAIN}/oauth2/token`, data, {headers}).catch((error) => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.log(error.response.data);
          console.log(error.response.status);
          console.log(error.response.headers);
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          console.log(error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          console.log('Error', error.message);
        }
        console.log(error.config);
      }); // Took Axios Errors from 
    
    // If this Fails note it, return the empty string, and 
    if(response == null || response.status != 200) {
        console.log("Failure: ", response);   
        return null;
    }
    return response?.data?.access_token;
}

// Verify the AWS JWT Token.
async function verify(poolID, clientID, token) {
    // Verifier that expects valid access tokens:
    const verifier = awsjwt.CognitoJwtVerifier.create({
        userPoolId: poolID,
        tokenUse: "access",
        clientId: clientID,
    });
    try {
        await verifier.verify(
        token // the JWT as string
        );
        console.log("Validated Token at"); // Log some info, primarily (USER NAME, and ACCESS TIME)
        return true;
    } catch {
        console.log("Invalid Token Received at");// Log some info, primarily (ACCESS TIME)
        return false;
    }
    return true;
}

module.exports = {verify, getToken};
