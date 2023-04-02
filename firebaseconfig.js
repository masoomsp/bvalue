const firebase = require('firebase/compat/app');
const auth_firebase = require('firebase/compat/auth');
const db_firestore = require('firebase/compat/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyAwUQlCm_2b1-fOqP3npYjn8uyVw61Q3mo",
    authDomain: "nodetask-3f111.firebaseapp.com",
    projectId: "nodetask-3f111",
    storageBucket: "nodetask-3f111.appspot.com",
    messagingSenderId: "802820142672",
    appId: "1:802820142672:web:61c52ee6b7f44f262c4355",
    measurementId: "G-YJRZKRMYG0"
  }
  
  firebase.initializeApp(firebaseConfig)
  const UsersData = firebase.firestore().collection("UsersData")

  module.exports = {UsersData, firebase, auth_firebase}