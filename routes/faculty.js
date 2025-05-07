console.log("loading faculty version 1.3");
// Pull in Express Framework
const express = require('express');
const CONSTS = require('../modules/consts');
const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider({
  region: 'us-east-2', // <-- or whatever region you're using (use CONSTS.REGION if that's defined)
  accessKeyId: 'AKIAW3MEAIQPHYMFTGZD',
  secretAccessKey: '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'
});
// MongoDB
const { MongoClient, ServerApiVersion } = require('mongodb');
const mongouri = process.env.MONGO_URI;

// Router
const faculty_router = express.Router();

/* Express JS URL Path code -- Faculty*/
// Route for Logins
faculty_router.get("/Login/Faculty", async (req, res) => {
    console.log("🔁 Faculty Login Hit");
    console.log("Auth code from query:", req.query.code);
    console.log("Cookies:", req.cookies);
    const authCode = req.query.code;
    // Could do a guard but I think this comes out to be better
    if (req.cookies.Token == undefined || req.cookies.LastCode != authCode) {
        var token = await getToken(authCode);
        if (await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, token)) {
            res.cookie("Token", token, { maxAge: CONSTS.HOUR, httpOnly: true }).cookie("LastCode", authCode, { maxAge: CONSTS.HOUR, httpOnly: true }).render("admin/login.ejs");
            return;
        }
    } else {
        if (await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
            res.render("admin/login.ejs");
            return;
        }
    } 
    console.log(req.cookies.Token, "\n",(req.cookies.Token != undefined));
    res.render("admin/failed-login.ejs");
});



// Make Query, and Display results
faculty_router.get("/Insert", async (req, res) =>  {

   if (req.cookies.Token == undefined || !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
     res.render('public/restricted-fac.ejs');
     return; // Paranoia
   } 
  res.render('admin/insert.ejs');
});

faculty_router.post("/Insert", async (req, res) => {
  
   if (req.cookies.Token == undefined || !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
     res.render('public/restricted-fac.ejs');
     return; // Paranoia
   } 
  console.log(req.body);
    
  // Create a MongoClient with a MongoClientOptions object to set the Stable API version
  const client = new MongoClient(mongouri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
        // Connect to the "insertDB" database and access its "haiku" collection
        const database = client.db("PhDSite");
        const StudentInfoCol = database.collection("EssentialInfo");
        const StudentProgressCol = database.collection("SemesterInfo");
        const AdvisorInfoCol = database.collection("AdvisorInfo");
        const TAInfoCol = database.collection("TA_Info");

        console.log(req.body.StudentEmail);
        // Create a document to insert
        // Need to verify Emails are valid, if not we need to abort
        // rather than cluttering the DB 
        var StudentInfo = { // EssentialInfo
          $set: {
            StudentID: parseInt(req.body.StudentID, 10),
            StudentEmail: req.body.StudentEmail,
            Advisor: req.body.Advisor,
            MaxTerm: req.body.MaxTerm,
            Pathway: req.body.Pathway,
          }
        };
        var StudentProgress = { // SemesterInfo
          $set: {
            Advisor: req.body.Advisor,
            Year: req.body.Year,
            Semester: req.body.Semester,
            GPA: parseFloat(req.body.GPA),
            TotalUnits: parseInt(req.body.TotalUnits, 10),
            RA_TA: req.body.RA_TA,
            FileStore:"PhD2023",
            ExpectedGradYear: req.body.ExpectedGradYear,
            ExpectedGradTerm: req.body.ExpectedGradTerm,
            PassedQualifyingExam: (req.body.PassedQualifyingExam === 'true'),
            DissertationComm: (req.body.DissertationComm === 'true'),
            PassedDefense: (req.body.PassedDefense === 'true'),
            PassedProposal: (req.body.PassedProposal === 'true'),
            SubmittedDIG: (req.body.SubmittedDIG === 'true'),
            Graduated: (req.body.Graduated === 'true'),
            StudentID: parseInt(req.body.StudentID, 10)
          }
        };
        var AdvisorInfo = {
          $set: {
            StudentID: parseInt(req.body.StudentID, 10),
            StudentEmail: req.body.StudentEmail,
            Advisor: req.body.Advisor,
            HasAdvisor: (req.body.HasAdvisor === 'true'),
            Year: req.body.Year,
            Semester: req.body.Semester,
          }
        };
        var TA_Info = {
            StudentID: parseInt(req.body.StudentID, 10),
            TA_Year: req.body.TA_Year,
            TA_Term: req.body.TA_Term,
        };

        // Updated, or create the document.
        var result; 
        if (req.body.InsertionType == "All" || req.body.InsertionType == "StudentInfo") {
          result = StudentInfoCol.updateOne({StudentID: req.body.StudentID}, StudentInfo, { upsert: true });
        }

        if (req.body.InsertionType == "All" || req.body.InsertionType == "StudentProgress") {
          result = StudentProgressCol.updateOne({StudentID: req.body.StudentID}, StudentProgress, { upsert: true });
        }

        if (req.body.InsertionType == "All" || req.body.InsertionType == "AdvisorInfo") {
          result = AdvisorInfoCol.updateOne({StudentID: req.body.StudentID}, AdvisorInfo, { upsert: true });        
        }

        if (req.body.InsertionType == "All" || req.body.InsertionType == "TA_Info") {
          result = TAInfoCol.insertOne(TA_Info);
        }

      } catch(err){
          console.error("Error in MongoDB INSERT: ", err);            
      } finally {
         // Close the MongoDB client connection
        //await client.close();
      }
    res.render('admin/insert.ejs');
});

// Make Query, and Display results
faculty_router.get("/InsertAll", async (req, res) =>  {

   if (req.cookies.Token == undefined || !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
     res.render('public/restricted-fac.ejs');
     return; // Paranoia
   } 
  res.render('admin/insertAll.ejs');
});

faculty_router.post("/InsertAll", async (req, res) => {
  
   if (req.cookies.Token == undefined || !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
     res.render('public/restricted-fac.ejs');
     return; // Paranoia
   } 
  console.log(req.body);
    
  // Create a MongoClient with a MongoClientOptions object to set the Stable API version
  const client = new MongoClient(mongouri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
        // Connect to the "insertDB" database and access its "haiku" collection
        const database = client.db("PhDSite");
        const StudentInfoCol = database.collection("EssentialInfo");
        const StudentProgressCol = database.collection("SemesterInfo");
        const AdvisorInfoCol = database.collection("AdvisorInfo");
        const TAInfoCol = database.collection("TA_Info");

        console.log(req.body.StudentEmail);
        // Create a document to insert
        // Need to verify Emails are valid, if not we need to abort
        // rather than cluttering the DB 
        var StudentInfo = { // EssentialInfo
          $set: {
            StudentID: parseInt(req.body.StudentID, 10),
            StudentEmail: req.body.StudentEmail,
            Advisor: req.body.Advisor,
            MaxTerm: req.body.MaxTerm,
            Pathway: req.body.Pathway,
          }
        };
        var StudentProgress = { // SemesterInfo
          $set: {
            Advisor: req.body.Advisor,
            Year: req.body.Year,
            Semester: req.body.Semester,
            GPA: parseFloat(req.body.GPA),
            TotalUnits: parseInt(req.body.TotalUnits, 10),
            RA_TA: req.body.RA_TA,
            FileStore:"PhD2023",
            ExpectedGradYear: req.body.ExpectedGradYear,
            ExpectedGradTerm: req.body.ExpectedGradTerm,
            PassedQualifyingExam: (req.body.PassedQualifyingExam === 'true'),
            DissertationComm: (req.body.DissertationComm === 'true'),
            PassedDefense: (req.body.PassedDefense === 'true'),
            PassedProposal: (req.body.PassedProposal === 'true'),
            SubmittedDIG: (req.body.SubmittedDIG === 'true'),
            Graduated: (req.body.Graduated === 'true'),
            StudentID: parseInt(req.body.StudentID, 10)
          }
        };
        var AdvisorInfo = {
          $set: {
            StudentID: parseInt(req.body.StudentID, 10),
            StudentEmail: req.body.StudentEmail,
            Advisor: req.body.Advisor,
            HasAdvisor: (req.body.HasAdvisor === 'true'),
            Year: req.body.Year,
            Semester: req.body.Semester,
          }
        };
        var TA_Info = {
            StudentID: parseInt(req.body.StudentID, 10),
            TA_Year: req.body.TA_Year,
            TA_Term: req.body.TA_Term,
        };

        // Updated, or create the document.
        var result; 
        if (req.body.InsertionType == "All" || req.body.InsertionType == "StudentInfo") {
          result = StudentInfoCol.updateOne({StudentID: parseInt(req.body.StudentID, 10)}, StudentInfo, { upsert: true });
        }

        if (req.body.InsertionType == "All" || req.body.InsertionType == "StudentProgress") {
          result = StudentProgressCol.updateOne({StudentID: parseInt(req.body.StudentID, 10)}, StudentProgress, { upsert: true });
        }

        if (req.body.InsertionType == "All" || req.body.InsertionType == "AdvisorInfo") {
          result = AdvisorInfoCol.updateOne({StudentID: parseInt(req.body.StudentID, 10)}, AdvisorInfo, { upsert: true });        
        }

        if (req.body.InsertionType == "All" || req.body.InsertionType == "TA_Info") {
          result = TAInfoCol.insertOne(TA_Info);
        }

      } catch(err){
          console.error("Error in MongoDB INSERT: ", err);            
      } finally {
         // Close the MongoDB client connection
        //await client.close();
      }
    res.render('admin/insertAll.ejs');
});

faculty_router.get("/InsertStudentInfo", async (req, res) =>  {

   if (req.cookies.Token == undefined || !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
     res.render('public/restricted-fac.ejs');
     return; // Paranoia
   } 
  res.render('admin/insertStudInfo.ejs');
});

faculty_router.post("/InsertStudentInfo", async (req, res) => {
  
   if (req.cookies.Token == undefined || !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
     res.render('public/restricted-fac.ejs');
     return; // Paranoia
   } 
  console.log(req.body);
    
  // Create a MongoClient with a MongoClientOptions object to set the Stable API version
  const client = new MongoClient(mongouri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
        // Connect to the "insertDB" database and access its "haiku" collection
        const database = client.db("PhDSite");
        const StudentInfoCol = database.collection("EssentialInfo");
        const StudentProgressCol = database.collection("SemesterInfo");
        const AdvisorInfoCol = database.collection("AdvisorInfo");

        console.log(req.body.StudentEmail);
        // Create a document to insert
        // Need to verify Emails are valid, if not we need to abort
        // rather than cluttering the DB 
        var StudentInfo = { // EssentialInfo
          $set: {
            StudentID: parseInt(req.body.StudentID, 10),
            StudentEmail: req.body.StudentEmail,
            Advisor: req.body.Advisor,
            MaxTerm: req.body.MaxTerm,
            Pathway: req.body.Pathway,
          }
        };
        var AdvisorInfo = {
          $set: {
            StudentEmail: req.body.StudentEmail,
            Advisor: req.body.Advisor,
          }
        };
        var StudentProgress = { // SemesterInfo
          $set: {
            Advisor: req.body.Advisor,
          }
        };

        // Updated, or create the document.
        var result; 
        if (req.body.InsertionType == "All" || req.body.InsertionType == "StudentInfo") {
          result = StudentInfoCol.updateOne({StudentID: parseInt(req.body.StudentID, 10)}, StudentInfo, { upsert: true });
        }
        if (req.body.InsertionType == "All" || req.body.InsertionType == "StudentInfo") {
          result = AdvisorInfoCol.updateOne({StudentID: parseInt(req.body.StudentID, 10)}, AdvisorInfo, { upsert: true });
        }
        if (req.body.InsertionType == "All" || req.body.InsertionType == "SemesterInfo") {
          result = StudentProgressCol.updateOne({StudentID: parseInt(req.body.StudentID, 10)}, StudentProgress, { upsert: true });
        }

      } catch(err){
          console.error("Error in MongoDB INSERT: ", err);            
      } finally {
         // Close the MongoDB client connection
        //await client.close();
      }
    res.render('admin/insertStudInfo.ejs');
});

faculty_router.get("/InsertStudentProg", async (req, res) =>  {

   if (req.cookies.Token == undefined || !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
     res.render('public/restricted-fac.ejs');
     return; // Paranoia
   } 
  res.render('admin/insertStudProg.ejs');
});

faculty_router.post("/InsertStudentProg", async (req, res) => {
  
   if (req.cookies.Token == undefined || !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
     res.render('public/restricted-fac.ejs');
     return; // Paranoia
   } 
  console.log(req.body);
    
  // Create a MongoClient with a MongoClientOptions object to set the Stable API version
  const client = new MongoClient(mongouri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
        // Connect to the "insertDB" database and access its "haiku" collection
        const database = client.db("PhDSite");
        const StudentInfoCol = database.collection("EssentialInfo");
        const StudentProgressCol = database.collection("SemesterInfo");
        const AdvisorInfoCol = database.collection("AdvisorInfo");

        console.log(req.body.StudentEmail);
        // Create a document to insert
        // Need to verify Emails are valid, if not we need to abort
        // rather than cluttering the DB 

        var StudentProgress = { // SemesterInfo
          $set: {
            Advisor: req.body.Advisor,
            Year: req.body.Year,
            Semester: req.body.Semester,
            GPA: parseFloat(req.body.GPA),
            TotalUnits: parseInt(req.body.TotalUnits, 10),
            RA_TA: req.body.RA_TA,
            FileStore:"PhD2023",
            ExpectedGradYear: req.body.ExpectedGradYear,
            ExpectedGradTerm: req.body.ExpectedGradTerm,
            PassedQualifyingExam: (req.body.PassedQualifyingExam === 'true'),
            DissertationComm: (req.body.DissertationComm === 'true'),
            PassedDefense: (req.body.PassedDefense === 'true'),
            PassedProposal: (req.body.PassedProposal === 'true'),
            SubmittedDIG: (req.body.SubmittedDIG === 'true'),
            Graduated: (req.body.Graduated === 'true'),
            StudentID: parseInt(req.body.StudentID, 10)
          }
        };

        var StudentInfo = { // EssentialInfo
          $set: {
            Advisor: req.body.Advisor,
          }
        };
        var AdvisorInfo = {
          $set: {
            Advisor: req.body.Advisor,
            Year: req.body.Year,
            Semester: req.body.Semester,
          }
        };

        // Updated, or create the document.
        var result; 

        if (req.body.InsertionType == "All" || req.body.InsertionType == "StudentProgress") {
          result = StudentProgressCol.updateOne({StudentID: parseInt(req.body.StudentID, 10)}, StudentProgress, { upsert: true });
        }
        if (req.body.InsertionType == "All" || req.body.InsertionType == "StudentProgress") {
          result = StudentInfoCol.updateOne({StudentID: parseInt(req.body.StudentID, 10)}, StudentInfo, { upsert: true });
        }
        if (req.body.InsertionType == "All" || req.body.InsertionType == "StudentProgress") {
          result = AdvisorInfoCol.updateOne({StudentID: parseInt(req.body.StudentID, 10)}, AdvisorInfo, { upsert: true });
        }

      } catch(err){
          console.error("Error in MongoDB INSERT: ", err);            
      } finally {
         // Close the MongoDB client connection
        //await client.close();
      }
    res.render('admin/insertStudProg.ejs');
});

faculty_router.get("/InsertAdvisorInfo", async (req, res) =>  {

   if (req.cookies.Token == undefined || !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
     res.render('public/restricted-fac.ejs');
     return; // Paranoia
   } 
  res.render('admin/insertAdvisor.ejs');
});

faculty_router.post("/InsertAdvisorInfo", async (req, res) => {
  
   if (req.cookies.Token == undefined || !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
     res.render('public/restricted-fac.ejs');
     return; // Paranoia
   } 
  console.log(req.body);
    
  // Create a MongoClient with a MongoClientOptions object to set the Stable API version
  const client = new MongoClient(mongouri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
        // Connect to the "insertDB" database and access its "haiku" collection
        const database = client.db("PhDSite");
        const StudentInfoCol = database.collection("EssentialInfo");
        const StudentProgressCol = database.collection("SemesterInfo");
        const AdvisorInfoCol = database.collection("AdvisorInfo");

        console.log(req.body.StudentEmail);
        // Create a document to insert
        // Need to verify Emails are valid, if not we need to abort
        // rather than cluttering the DB 
        var AdvisorInfo = {
          $set: {
            StudentID: parseInt(req.body.StudentID, 10),
            StudentEmail: req.body.StudentEmail,
            Advisor: req.body.Advisor,
            HasAdvisor: (req.body.HasAdvisor === 'true'),
            Year: req.body.Year,
            Semester: req.body.Semester,
          }
        };

        var StudentInfo = { // EssentialInfo
          $set: {
            StudentEmail: req.body.StudentEmail,
            Advisor: req.body.Advisor,
          }
        };
        var StudentProgress = { // SemesterInfo
          $set: {
            Advisor: req.body.Advisor,
            Year: req.body.Year,
            Semester: req.body.Semester,
          }
        };

        // Updated, or create the document.
        var result; 
        if (req.body.InsertionType == "All" || req.body.InsertionType == "AdvisorInfo") {
          result = AdvisorInfoCol.updateOne({StudentID: parseInt(req.body.StudentID, 10)}, AdvisorInfo, { upsert: true });        
        }

        if (req.body.InsertionType == "All" || req.body.InsertionType == "AdvisorInfo") {
          result = StudentInfoCol.updateOne({StudentID: parseInt(req.body.StudentID, 10)}, StudentInfo, { upsert: true });        
        }
        if (req.body.InsertionType == "All" || req.body.InsertionType == "AdvisorInfo") {
          result = StudentProgressCol.updateOne({StudentID: parseInt(req.body.StudentID, 10)}, StudentProgress, { upsert: true });        
        }

      } catch(err){
          console.error("Error in MongoDB INSERT: ", err);            
      } finally {
         // Close the MongoDB client connection
        //await client.close();
      }
    res.render('admin/insertAdvisor.ejs');
});

faculty_router.get("/InsertTAInfo", async (req, res) =>  {

   if (req.cookies.Token == undefined || !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
     res.render('public/restricted-fac.ejs');
     return; // Paranoia
   } 
  res.render('admin/insertTA.ejs');
});

faculty_router.post("/InsertTAInfo", async (req, res) => {
  
   if (req.cookies.Token == undefined || !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
     res.render('public/restricted-fac.ejs');
     return; // Paranoia
   } 
  console.log(req.body);
    
  // Create a MongoClient with a MongoClientOptions object to set the Stable API version
  const client = new MongoClient(mongouri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
        // Connect to the "insertDB" database and access its "haiku" collection
        const database = client.db("PhDSite");
        const TAInfoCol = database.collection("TA_Info");

        console.log(req.body.StudentEmail);
        // Create a document to insert
        // Need to verify Emails are valid, if not we need to abort
        // rather than cluttering the DB 
        var TA_Info = {
            StudentID: parseInt(req.body.StudentID, 10),
            TA_Year: req.body.TA_Year,
            TA_Term: req.body.TA_Term,
        };

        // Updated, or create the document.
        var result; 
        if (req.body.InsertionType == "All" || req.body.InsertionType == "TA_Info") {
          result = TAInfoCol.insertOne(TA_Info);
        }

      } catch(err){
          console.error("Error in MongoDB INSERT: ", err);            
      } finally {
         // Close the MongoDB client connection
        //await client.close();
      }
    res.render('admin/insertTA.ejs');
});

// Query DB
faculty_router.get("/Query", async (req, res) => {
	if (req.cookies.Token == undefined || !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
		res.render('public/restricted-fac.ejs');
		return; // Paranoia
	} 
	res.render('admin/query.ejs');
});

faculty_router.post("/Query", async (req, res) => {
	 if (req.cookies.Token == undefined || !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
		res.render('public/restricted-fac.ejs');
		return; // Paranoia
	} 
	
	// Create a MongoClient with a MongoClientOptions object to set the Stable API version
	var client = new MongoClient(mongouri, {
		serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
		}
	});

	var matchstmtn = [{"StudentEmail" : "Null"}]; //ACCPETED = ["StudentID", "Apprenticeship", "HasAdvisor", "PassedDefense", "PassedProposal", "PassedDefense", "SubmittedClearanceForm", "SubmittedDIG", "Advisor"];
	if (req.body.select == "StudentID") {
    matchstmtn = [{"StudentID" : parseInt(req.body.where, 10)}];
	} else if (req.body.select == "StudentEmail") {
		matchstmtn = [{"StudentEmail" : req.body.where}];
  } else if (req.body.select == "GPA") {
		matchstmtn = [{"GPA" : parseFloat(req.body.where, 10)}];
  } else if (req.body.select == "TotalUnits") {
		matchstmtn = [{"TotalUnits" : parseInt(req.body.where, 10)}];
	} else if (req.body.select == "HasAdvisor") {
		matchstmtn = [{"HasAdvisor" : (req.body.where === 'true')}];
	} else if (req.body.select == "PassedProposal") {
		matchstmtn = [{"PassedProposal" : (req.body.where === 'true')}];
  } else if (req.body.select == "TA_RA") {
		matchstmtn = [{"TA_RA" : req.body.where}];
  } else if (req.body.select == "TA_Year") {
		matchstmtn = [{"TA_Year" : req.body.where}];
  } else if (req.body.select == "TA_Term") {
		matchstmtn = [{"TA_Term" : req.body.where}];
  } else if (req.body.select == "Year") {
		matchstmtn = [{"Year" : req.body.where}];
  } else if (req.body.select == "Semester") {
		matchstmtn = [{"Semester" : req.body.where}];
  } else if (req.body.select == "MaxTerm") {
		matchstmtn = [{"MaxTerm" : req.body.where}];
	} else if (req.body.select == "PassedDefense") {
		matchstmtn = [{"PassedDefense" : (req.body.where === 'true')}];
	} else if (req.body.select == "DissertationComm") {
		matchstmtn = [{"DissertationComm" : (req.body.where === 'true')}];
	} else if (req.body.select == "SubmittedDIG") {
		matchstmtn = [{"SubmittedDIG" : (req.body.where === 'true')}];
	} else if (req.body.select == "Advisor") {
		matchstmtn = [{"Advisor" : req.body.where}];
  } else if (req.body.select == "ExpectedGradYear") {
		matchstmtn = [{"ExpectedGradYear" : req.body.where}];
  } else if (req.body.select == "ExpectedGradTerm") {
		matchstmtn = [{"ExpectedGradTerm" : req.body.where}];
  } else if (req.body.select == "Graduated") {
		matchstmtn = [{"Graduated" : (req.body.where === 'true')}];
	}

	try {
		// Connect to the "insertDB" database and access its "haiku" collection
		const database = client.db("PhDSite");
		const StudentInfoCol = database.collection("EssentialInfo");
		
		const agg = [
			{    
				$lookup:
				{
					from: "SemesterInfo",
					localField: "StudentID",
					foreignField: "StudentID",
					as: "ProgDoc"
				}
			},  
			{   $unwind:"$ProgDoc" },
      {    
				$lookup:
				{
					from: "EssentialInfo",
					localField: "StudentID",
					foreignField: "StudentID",
					as: "StudDoc"
				}
			},  
			{   $unwind:"$StudDoc" },
			{
				$lookup:
				{
					from: "AdvisorInfo",
					localField: "StudentID",
					foreignField: "StudentID",
					as: "AddDoc"
				}
			},  
			{   $unwind:"$AddDoc" },
      {
				$lookup:
				{
					from: "TA_Info",
					localField: "StudentID",
					foreignField: "StudentID",
					as: "TADoc"
				}
			},  
			{
				$project: 
				{
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
			},
      {
				$match:{
					$and: matchstmtn
				}
			}, 
      {
        $sort:{
          StudentEmail: 1
        }
      }  
      
			]; 
		//var test = await database.aggregate(agg);    
		// Create View 
		//const view = await database.createCollection( 'testViews', { viewOn:'EssentialInfo',  pipeline: agg} );
		const result = await StudentInfoCol.aggregate(agg).toArray();
		res.render("admin/view.ejs", {title: 'Student Query Results', StudentData: result});
	} catch (err) { console.error("Error Querying student data", err)} finally{ await client.close(); }
});

 faculty_router.post("/Query", async (req, res) => {
 	if (req.cookies.Token == undefined || !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
 		res.render('public/restricted-fac.ejs');
 		return; // Paranoia
 	} 
 });

 faculty_router.get("/Update", async (req, res) => {
 	if (req.cookies.Token == undefined || !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)) {
 		res.render('public/restricted-fac.ejs');
 		return; // Paranoia
 	} 
 	res.render('admin/query.ejs');

//   // Create a MongoClient with a MongoClientOptions object to set the Stable API version
 	var client = new MongoClient(mongouri, {
 		serverApi: {
 		version: ServerApiVersion.v1,
 		strict: true,
 		deprecationErrors: true,
 		}
 	});
 });

 faculty_router.get("/AddUser", async (req, res) => {
  if (
    req.cookies.Token === undefined ||
    !await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token)
  ) {
    res.render('public/restricted-fac.ejs');
    return;
  }

  // Render the form page - you can make this an EJS file for better styling
  res.render('admin/add-user.ejs'); // you'd create this file in your views/admin folder
});

faculty_router.post("/Faculty/AddUser", async (req, res) => {
  const { email, tempPassword } = req.body;

  if (
    req.cookies.Token == undefined ||
    !(await verify(CONSTS.FAC_POOL, CONSTS.FAC_CLIENT, req.cookies.Token))
  ) {
    res.render("public/restricted-fac.ejs");
    return;
  }

  const params = {
    UserPoolId: CONSTS.FAC_POOL,
    Username: email,
    TemporaryPassword: tempPassword,
    UserAttributes: [
      {
        Name: "email",
        Value: email,
      },
      {
        Name: "email_verified",
        Value: "true",
      },
    ],
    MessageAction: "SUPPRESS", // optional: prevents email sending
  };

  try {
    await cognito.adminCreateUser(params).promise();
    res.render("admin/login.ejs");
  } catch (error) {
    console.error(error);
    res.status(500).send("❌ Failed to create user.");
  }
});

faculty_router.get("/Logout", (req, res) => {
  // Clear the local cookie (Token)
  res.clearCookie("Token", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: false // Use true if you're using HTTPS
  });

  // Cognito logout URL and redirect
  const logoutRedirectURI = "http://localhost:3000"; // or wherever your app lands after logout
  const cognitoDomain = "https://us-east-216d6z1cgf.auth.us-east-2.amazoncognito.com"; // your Cognito domain
  const clientID = "1287qolpmbpv3397lv2ib3vpp3"; // your Cognito client ID

  const logoutURL = `${cognitoDomain}/logout?client_id=${clientID}&logout_uri=${encodeURIComponent(logoutRedirectURI)}`;

  // Redirect to Cognito logout endpoint
  res.redirect(logoutURL);
});

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
    data.append("client_id", CONSTS.FAC_CLIENT);
    data.append("code", authCode);
    data.append("redirect_uri", CONSTS.FAC_LOGIN);
    const credentials = `${CONSTS.FAC_CLIENT}:${CONSTS.FAC_SECRET}`;
    const base64Credentials = Buffer.from(credentials).toString("base64");
    const basicAuthorization = `Basic ${base64Credentials}`;
    const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": basicAuthorization
      };
    
    // Send POST request and await response
    const response = await axios.post(`${CONSTS.FAC_DOMAIN}/oauth2/token`, data, {headers}).catch((error) => {
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
      const payload = await verifier.verify(token);
      console.log("✅ Valid token payload:", payload);
      return true;
  } catch (err) {
      console.log("❌ Invalid Token Received:", err);
      return false;
  }
}

const jwt = require('jsonwebtoken')
// https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/cognito-identity-provider/command/GetUserCommand/
async function getUID(token) {
  const dtoken = jwt.decode(token);
  return dtoken.username;
}

module.exports = faculty_router;