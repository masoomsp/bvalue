const cookieParser = require("cookie-parser");

const bodyParser = require("body-parser");
const csrf = require("csurf");
const express = require("express");
const admin = require("firebase-admin");


const serviceAccount = require("./serviceAccount.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://nodetask-3f111.firebaseio.com",
});

const csrfMiddleware = csrf({ cookie: true });

const PORT = process.env.PORT || 8000;
const app = express();

app.engine("html", require("ejs").renderFile);
app.use(express.static("static"));

app.use(bodyParser.json());
app.use(cookieParser());
app.use(csrfMiddleware);

const db = admin.firestore();
app.all("*", (req, res, next) => {
  res.cookie("XSRF-TOKEN", req.csrfToken());
  next();
});

app.post("/sessionLogin", (req, res) => {
    const idToken = req.body.idToken.toString();
    var user = req.body.user;
  
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
  
    admin
      .auth()
      .createSessionCookie(idToken, { expiresIn })
      .then(
        (sessionCookie) => {
          const options = { maxAge: expiresIn, httpOnly: true };
          res.cookie("session", sessionCookie, options);
          res.cookie("user", user, options);
          res.end(JSON.stringify({ status: "success" }));
        },
        (error) => {
          res.status(401).send("UNAUTHORIZED REQUEST!");
        }
      );
});

app.post("/user/update", async (req, res) => {
  const sessionCookie = req.cookies.session || "";
  const userCookie = req.cookies.user || "";
  const uid = req.body.uid;
  const data = req.body;
  admin
    .auth()
    .verifySessionCookie(sessionCookie, true /** checkRevoked */)
    .then(async () => {
      const userID = uid;
      await db.collection('UsersData').doc(userID).update(data)
      .then(() => {
        res.redirect("/")
      });
      
    })
    .catch((error) => {
      res.redirect("/login");
    });
});

app.get("/sessionLogout", (req, res) => {
    res.clearCookie("session");
    res.redirect("/login");
});

app.get("/", async function (req, res) {
    // res.render("index.html");
    // res.send(req);
    const sessionCookie = req.cookies.session || "";
    const userCookie = req.cookies.user || "";
    // console.log(req.cookies._csrf);
    admin
      .auth()
      .verifySessionCookie(sessionCookie, true /** checkRevoked */)
      .then(async () => {
        
        const userID = userCookie.uid;
        // console.log(userID);
        const userDataSnap = await db.collection('UsersData').doc(userID).get();
        // console.log(userDataSnap);
        const userData = userDataSnap.data();
        // console.log(userData);
        res.render("profile.ejs",{user: userCookie, userData: userData});
        // res.render("profile.html",{user: userCookie});
      })
      .catch((error) => {
        res.redirect("/login");
      });
    // res.render("profile.html");
});

app.get("/login", function (req, res) {
    const sessionCookie = req.cookies.session || "";
    // console.log(req);
  
    admin
      .auth()
      .verifySessionCookie(sessionCookie, true /** checkRevoked */)
      .then(() => {
        res.redirect("/");
      })
      .catch((error) => {
        res.render("login.html");
      });
    // res.render("login.html");
});

app.get("/signup", function (req, res) {
    const sessionCookie = req.cookies.session || "";
  
    admin
      .auth()
      .verifySessionCookie(sessionCookie, true /** checkRevoked */)
      .then(() => {
        res.redirect("/");
      })
      .catch((error) => {
        res.render("signup.html");
      });
});
app.get("/user/edit", async function (req, res) {
  // res.render("index.html");
  
  const sessionCookie = req.cookies.session || "";
  const userCookie = req.cookies.user || "";
  // console.log(req.cookies.user);
  admin
    .auth()
    .verifySessionCookie(sessionCookie, true /** checkRevoked */)
    .then(async () => {
      
      const userID = userCookie.uid;
      // console.log(userID);
      const userDataSnap = await db.collection('UsersData').doc(userID).get();
      // console.log(userDataSnap);
      const userData = userDataSnap.data();
      // console.log(userData);
      
      res.render("profileedit.ejs",{user: userCookie, userData: userData});
      // res.render("profile.html",{user: userCookie});
    })
    .catch((error) => {
      res.redirect("/login");
    });
  // res.render("profile.html");
});
app.get("/users", async function (req, res) {
  // res.render("index.html");
  
  const sessionCookie = req.cookies.session || "";
  const userCookie = req.cookies.user || "";
  // console.log(req.cookies.user);
  admin
    .auth()
    .verifySessionCookie(sessionCookie, true /** checkRevoked */)
    .then(async () => {
      
      const userID = userCookie.uid;
      // console.log(userID);
      const userDataSnap = await db.collection('UsersData').doc(userID).get();
      // console.log(userDataSnap);
      const userData = userDataSnap.data();
      if(userData.role == 'admin'){
        const usersSnap = await db.collection('UsersData').get();
        const users = usersSnap.docs.map((doc) => ({id:doc.id, ...doc.data()}))
        // console.log(users)
        res.render("userslist.ejs",{user: userCookie, userData: userData, users: users});
      } else {
        res.redirect("/");
      }
      
      // console.log(userData);
      
      
      // res.render("profile.html",{user: userCookie});
    })
    .catch((error) => {
      console.log(error);
      res.redirect("/login");
    });
  // res.render("profile.html");
});

app.get("/userprofile/edit/:id", async function (req, res) {
  // res.render("index.html");
  
  const sessionCookie = req.cookies.session || "";
  const userCookie = req.cookies.user || "";
  
  // console.log(req.cookies.user);
  admin
    .auth()
    .verifySessionCookie(sessionCookie, true /** checkRevoked */)
    .then(async () => {
      
      const userID = req.params.id;
      
      // console.log(userID);
      const userDataSnap = await db.collection('UsersData').doc(userID).get();
      // console.log(userDataSnap);
      const userData = userDataSnap.data();
      // console.log(userData);
      // res.send(userData);
      res.render("useredit.ejs",{user: userCookie, userData: userData});
      // res.render("profile.html",{user: userCookie});
    })
    .catch((error) => {
      res.redirect("/login");
    });
  // res.render("profile.html");
});
app.get("/userprofile/delete/:id", async function (req, res) {
  // res.render("index.html");
  
  const sessionCookie = req.cookies.session || "";
  const userCookie = req.cookies.user || "";
  
  // console.log(req.cookies.user);
  admin
    .auth()
    .verifySessionCookie(sessionCookie, true /** checkRevoked */)
    .then(async () => {
      
      const userID = req.params.id;
      // res.send(req.params);
      admin.auth().deleteUser(userID)
      .then(async () => {
        console.log('user deleted');
        await db.collection('UsersData').doc(userID).delete()
        .then(()=> {
          console.log('collection deleted');
          res.redirect("/users");
        }).catch((error) => {
          console.log('collection not deleted');
          console.log(error);
          res.redirect("/users");
        })
        
      })
      .catch((error) => {
        console.log('user not deleted');
        console.log(error);
        res.redirect("/users");
      });
      
      
    })
    .catch((error) => {
      res.redirect("/login");
    });
  
});



app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});