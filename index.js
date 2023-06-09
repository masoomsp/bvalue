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

const {UsersData, firebase, db_firestore} = require('./firebaseconfig.js');
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE)

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
app.post("/login", async (req, res) => {
  // console.log(req.body);
  const email = req.body.login;
  const password = req.body.password;
  const csrfCookie = req.body.csrfCookie.toString();
  firebase.auth().signInWithEmailAndPassword(email, password)
  .then(({ user }) => {
    user.getIdToken().then(async (idToken) => {
      const expiresIn = 60 * 60 * 24 * 5 * 1000;
      admin.auth().createSessionCookie(idToken, { expiresIn })
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
    
  })
  .then(() => {
    firebase.auth().signOut();
  })
  .catch((error) => {
    console.log('login error');
    console.log(error);
  });
})
app.post("/signup", async (req, res) => {
  // console.log(req.body);
  const name = req.body.name;
  const lastname = req.body.lastname;
  const email = req.body.email;
  const password = req.body.password;
  const csrfCookie = req.body.csrfCookie.toString();

  firebase.auth().createUserWithEmailAndPassword(email, password)
  .then(({user})=>{
    db.collection('UsersData').doc(user.uid).set({
        uid: user.uid,
        name: name,
        lastname: lastname,
        email: email,
        password: password,
        role: 'user'
    })
    .then(() => {
      const userLoginRes =  user.getIdToken().then((idToken) => {
        const expiresIn = 60 * 60 * 24 * 5 * 1000;
        admin.auth().createSessionCookie(idToken, { expiresIn })
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
      })
      .then(() => {
          return firebase.auth().signOut();
      });
    });
        
  })
  .catch((error) => {
    console.log('signuo error');
    console.log(error);
  });

})
app.post("/profile/update", async (req, res) => {
  // console.log(req.body);
  const data = req.body.uData;
  db.collection('UsersData').doc(data.uid).update(data)
  .then(() => {
    res.redirect('/');
  })
  .catch((error) => {
    console.log('profile update error');
    console.log(error);
  });

})
app.post("/user/update", async (req, res) => {
  // console.log(req.body);
  const data = req.body.uData;
  db.collection('UsersData').doc(data.uid).update(data)
  .then(() => {
    res.redirect('/users');
  })
  .catch((error) => {
    console.log('User update error');
    console.log(error);
  });

})
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


app.get("/sessionLogout", (req, res) => {
    res.clearCookie("session");
    res.redirect("/login");
});

app.get("/", async function (req, res) {
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
      })
      .catch((error) => {
        res.redirect("/login");
      });
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
        res.render("login.ejs");
      });
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
        res.render("signup.ejs");
      });
});
app.get("/profile/edit", async function (req, res) {
  
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
    })
    .catch((error) => {
      res.redirect("/login");
    });
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
    })
    .catch((error) => {
      res.redirect("/login");
    });
});
app.get("/userprofile/delete/:id", async function (req, res) {
  
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