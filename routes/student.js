// Pull in Express Framework
const express = require('express');
const CONSTS = require('../modules/consts');
const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require('mongodb');
const mongouri = process.env.MONGO_URI;
const cognito = new AWS.CognitoIdentityServiceProvider({
  region: 'us-east-2', // <-- or whatever region you're using (use CONSTS.REGION if that's defined)
  accessKeyId: 'AKIAW3MEAIQPLDUJVP4Z',
  secretAccessKey: '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'
});
const student_router = express.Router();
/* Express JS URL Path code -- Index*/
// Root
student_router.get("/", (req, res) => {
    res.render('public/index.ejs');
});

student_router.get("/Login/Student", async (req, res) => {
    //res.render('Submission')
    const authCode = req.query.code;
    // Could do a guard but I think this comes out to be better
    if (req.cookies.Token == undefined || req.cookies.LastCode != authCode) {
        var token = await getToken(authCode);
        if (await verify(CONSTS.STUDENT_POOL, CONSTS.STUDENT_CLIENT, token)) {
            res.cookie("Token", token, { maxAge: CONSTS.HOUR, httpOnly: true }).cookie("LastCode", authCode, { maxAge: CONSTS.HOUR, httpOnly: true }).render("student/login.ejs");
            return;
        }
    } else {
        if (await verify(CONSTS.STUDENT_POOL, CONSTS.STUDENT_CLIENT, req.cookies.Token)) {
            res.render("student/login.ejs");
            return;
        }
    } 
    //console.log(req.cookies.Token, "\n",(req.cookies.Token != undefined));
    res.render("student/login.ejs");
});

/* Express JS URL Path code -- Student View*/
// This route handles students accessing the Submissions page to upload Progress Reports
student_router.get("/Submission", async (req, res) => {

    if (req.cookies.Token == undefined || !await verify(CONSTS.STUDENT_POOL, CONSTS.STUDENT_CLIENT, req.cookies.Token) || !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
        res.render('public/restricted-std.ejs');
        return;
    } 

    res.render('student/submission.ejs');
});


// Store File on the local disk based on the file store location for the student in the DB, if they do not exist display error page
student_router.post("/Submission", async (req, res) => {
    //res.render('Submission')
    if (req.cookies.Token == undefined || !await verify(CONSTS.STUDENT_POOL, CONSTS.STUDENT_CLIENT, req.cookies.Token) || !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
        res.render('public/restricted-std.ejs');
        return;
    }
    res.render('student/submission.ejs');
});


student_router.get("/Status", async (req, res) => {
    const token = req.cookies.Token;

    // Check if token is valid for faculty
    if (await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, token)) {
        res.redirect("/Query");
        return;
    }

    // Check if token is missing or invalid for student
    if (!token || !await verify(CONSTS.STUDENT_POOL, CONSTS.STUDENT_CLIENT, token)) {
        res.render('public/restricted-std.ejs');
        return;
    }

    const studentEmail = getEmail(token);


    // Token is valid student — continue to load data
    const client = new MongoClient(mongouri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });

    try {
        const database = client.db("PhDSite");
        const StudentInfoCol = database.collection("PhDStudent");

        const agg = [
            {
                $match: { "StudentEmail": studentEmail }
            },
            {
                $lookup: {
                    from: "SemesterInfo",
                    localField: "StudentID",
                    foreignField: "StudentID",
                    as: "ProgDoc"
                }
            },
            { $unwind: "$ProgDoc" },
            {
                $lookup: {
                    from: "EssentialInfo",
                    localField: "StudentID",
                    foreignField: "StudentID",
                    as: "StudDoc"
                }
            },
            { $unwind: "$StudDoc" },
            {
                $lookup: {
                    from: "AdvisorInfo",
                    localField: "StudentID",
                    foreignField: "StudentID",
                    as: "AddDoc"
                }
            },
            { $unwind: "$AddDoc" },
            {
                $lookup: {
                    from: "TA_Info",
                    localField: "StudentID",
                    foreignField: "StudentID",
                    as: "TADoc"
                }
            },
            {
                $project: {
                    _id: 0,
                    StudentID: 1,
                    StudentEmail: "$StudDoc.StudentEmail",
                    Graduated: "$ProgDoc.Graduated",
                    HasAdvisor: "$AddDoc.HasAdvisor",
                    Pathway: "$StudDoc.Pathway",
                    FileStore: "$ProgDoc.FileStore",
                    LastProgressReport: "$ProgDoc.LastProgressReport",
                    PassedDefense: "$ProgDoc.PassedDefense",
                    PassedProposal: "$ProgDoc.PassedProposal",
                    PassedQualifyingExam: "$ProgDoc.PassedQualifyingExam",
                    SubmittedDIG: "$ProgDoc.SubmittedDIG",
                    Advisor: "$AddDoc.Advisor",
                    Year: "$ProgDoc.Year",
                    Semester: "$ProgDoc.Semester",
                    GPA: "$ProgDoc.GPA",
                    TotalUnits: "$ProgDoc.TotalUnits",
                    RA_TA: "$ProgDoc.RA_TA",
                    ExpectedGradYear: "$ProgDoc.ExpectedGradYear",
                    ExpectedGradTerm: "$ProgDoc.ExpectedGradTerm",
                    MaxTerm: "$StudDoc.MaxTerm",
                    DissertationComm: "$ProgDoc.DissertationComm",
                    TA_Year: "$TADoc.TA_Year",
                    TA_Term: "$TADoc.TA_Term"
                }
            }
        ];
        

        const result = await StudentInfoCol.aggregate(agg).toArray();

        res.render("student/view.ejs", {
            title: 'PhD Student Status',
            StudentData: result
        });
    } catch (err) {
        console.error("Error querying student data:", err);
        res.render("public/error.ejs", { message: "Database error occurred." });
    } finally {
        await client.close();
    }
});
// In routes/student.js (mounted at /Student)

student_router.get('/Student/Logout', (req, res) => {
    // 1) Clear your local Token cookie
    res.clearCookie("Token", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: false  // set to true if you’re running HTTPS in production
    });
  
    // 2) Build the Cognito logout URL for *students*
    const logoutRedirectURI = "http://localhost:3000";  // where users land after logout
    const cognitoDomain     = "https://us-east-2cfxwpbghr.auth.us-east-2.amazoncognito.com";
    const clientID          = "6boq4oitv1q7tnk4aon9m4hp07";
  
    const logoutURL = `${cognitoDomain}/logout` +
                      `?client_id=${clientID}` +
                      `&logout_uri=${encodeURIComponent(logoutRedirectURI)}`;
  
    // 3) Redirect the browser to Cognito’s logout endpoint
    res.redirect(logoutURL);
  });
  

module.exports = student_router;


/*TEMP FUNCTIONS WHILE I FIGURE IT OUT*/

// AWS Cognito 
const awsjwt = require('aws-jwt-verify');
// Pull in axios Library for HTTPS Requests to Cognito
const axios = require('axios');

// Functions 
// Should only be called on the "/Login" Page. Then we store the auth token in a cookie, we should set this to expire in 1 hr as the token expires at that time
// https://docs.aws.amazon.com/cognito/latest/developerguide/token-endpoint.ejs
// https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.ejd
// https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.ejs
async function getToken(authCode) {
    // Format Request Parameters
    const data = new URLSearchParams();
    data.append("grant_type", "authorization_code");
    data.append("client_id", CONSTS.STUDENT_CLIENT);
    data.append("code", authCode);
    data.append("redirect_uri", CONSTS.STUDENT_LOGIN);
    const credentials = `${CONSTS.STUDENT_CLIENT}:${CONSTS.STUDENT_SECRET}`;
    const base64Credentials = Buffer.from(credentials).toString("base64");
    const basicAuthorization = `Basic ${base64Credentials}`;
    const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": basicAuthorization
      };
    
    // Send POST request and await response
    const response = await axios.post(`${CONSTS.STUDENT_DOMAIN}/oauth2/token`, data, {headers}).catch((error) => {
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
        //console.log("Validated Token at"); // Log some info, primarily (USER NAME, and ACCESS TIME)
        return true;
    } catch {
        console.log("Invalid Token Received");// Log some info, primarily (ACCESS TIME)
        return false;
    }
}

// https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/cognito-identity-provider/command/GetUserCommand/
function getEmail(token) {
    const dtoken = jwt.decode(token);
    return dtoken.email || dtoken["cognito:username"]; // fallback if email isn't in token
  }
  