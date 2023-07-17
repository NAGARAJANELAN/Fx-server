import express from "express";
import cors from "cors";
import run from "./mongoConnect.js";
const app = express();
const PORT = 3500;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

//create connection with db
const MongoDB = await run();

// ========================login and register section =========================================================

//registering new user
app.post("/register", async function (req, res) {
  var obj = {
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
  };
  try {
    if ((await getUserDetails({ email: req.body.email })).length > 0) {
      //user already exists
      res.json({ valid: false , msg:"Email already used"});
      return;
    }
    await MongoDB.db("UserDetails").collection("Credentials").insertOne(obj);
    //also create document for transactions saving too
    await MongoDB.db("UserTransactions")
      .collection("Transactions")
      .insertOne({ email: obj.email });

    res.json({ valid: true });
  } catch {
    res.json({ valid: false });
  }
});

// user login request handler
app.post("/login", async function (req, res) {
  var query = {
    email: req.body.email,
  };
  try {
    var userDetails = await getUserDetails(query);
    var storedPassword = userDetails[0].password;
    var enteredPassword = req.body.password;
    res.json({ valid: enteredPassword === storedPassword });
  } catch {
    console.log("login error");
    res.json({ valid: false });
  }
});

//helper function to get necessary user details based on query passed -> array
async function getUserDetails(query) {
  var userDetails = await MongoDB.db("UserDetails") // database
    .collection("Credentials") // collection
    .find(query, { projection: { _id: 0, email: 0 } })
    .toArray();
  return userDetails;
}

// ============================ End of login & register section =========================================================

// post transaction for each user
app.post("/post-transaction", async function (req, res) {
  var userEmail = req.body.email;
  var userNote = req.body.note;
  var amount = req.body.amount;
  var date=new Date();
  try {
    await MongoDB.db("UserTransactions")
      .collection("Transactions")
      .updateOne(
        { email: userEmail },
        {
          $addToSet: {
            payments: {
              amount: amount,
              note: userNote,
              time: `${date.toDateString()} at ${date.toLocaleTimeString()}`,
            },
          },
        }
      );
    res.json({ success: true });
  } catch (error) {
    console.log(error);
    res.json({ success: false });
  }
});

// to get all transactions of a user
app.post("/get-transactions", async function (req, res) {
  var userEmail = req.body.email;
  try {
    var userTransactions = await MongoDB.db("UserTransactions")
      .collection("Transactions")
      .find({ email: userEmail }, { projection: { _id: 0 } })
      .toArray();

    var userPayments = userTransactions[0].payments;
    // console.log(userPayments);
    res.send(userPayments);
  } catch (error) {
    console.log(error);
    res.send("Payment retrieving error");
  }
});

// to get particular month payment details for a user
app.post("/get-transaction", async function (req, res) {
  var monthTransactions = Array(31).fill(0);
  var userEmail = req.body.email;
  var month = req.body.month - 1;
  var year = req.body.year;
  try {
    var userTransactions = await MongoDB.db("UserTransactions")
      .collection("Transactions")
      .find({ email: userEmail }, { projection: { _id: 0 } })
      .toArray();

    var userPayments = userTransactions[0].payments;

    for (var t = 0; t < userPayments.length; t++) {
      var date = new Date(userPayments[t].time);
      if (date.getFullYear() === year && date.getMonth() === month) {
        monthTransactions[date.getDate() - 1] =
          monthTransactions[date.getDate() - 1] + userPayments[t].amount;
      }
    }

    // console.log(monthTransactions);
    res.send(monthTransactions);
  } catch (error) {
    console.log(error);
    res.send("Month Payment retrieving error");
  }
});

//close connection with db
app.get("/close", async (req, res) => {
  await MongoDB.close();
  res.send("connection closed");
});

//server start
app.listen(PORT, () => {
  console.log("server running on " + PORT);
});
