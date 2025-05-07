// HOUR in MS
const HOUR = 3600000;
/* Global Configuration Variables*/
// Port used would be an Env set or 1337 (Microsoft did this!)
const  PORT = process.env.PORT || 3000;
// Host IP
const HOST = '0.0.0.0';
// Cognito Domain URL
const FAC_DOMAIN = process.env.FAC_DOMAIN
const STUDENT_DOMAIN = "https://us-east-2cfxwpbghr.auth.us-east-2.amazoncognito.com"
// Cognito PoolID
const FAC_POOL = "us-east-2_16d6z1CGF"
const STUDENT_POOL = "us-east-2_CFXWPBGHr"
// Cognito Client ID
const FAC_CLIENT = process.env.FAC_CLIENT;
const STUDENT_CLIENT = "6boq4oitv1q7tnk4aon9m4hp07"
// TEMP SECRET -- REPLACE AND REMOVE 
const FAC_SECRET = "c0aggp7p1vh85rt9vcd5rjd3s8kdmmhue1sab0e0jctbubhsa0p"
const STUDENT_SECRET = "hvhk52n86sqdo20v7q2adjfrs8rgij2tkhepuaiothccdmh5ci9"
// URI for Redirects
const FAC_LOGIN = "http://localhost:3000/Login/Faculty"
const STUDENT_LOGIN = "http://localhost:3000/Login/Student"

const REGION = "us-east-2";



module.exports = {HOST, HOUR, PORT, FAC_DOMAIN, STUDENT_DOMAIN, FAC_POOL, STUDENT_POOL, FAC_CLIENT, STUDENT_CLIENT, FAC_SECRET, STUDENT_SECRET, FAC_LOGIN, STUDENT_LOGIN};
