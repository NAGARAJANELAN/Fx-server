import { MongoClient, ServerApiVersion } from "mongodb";
import * as dotenv from 'dotenv';
dotenv.config();

const uri =process.env.MONGODB_URL;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log(" You successfully connected to MongoDB!");
    return client;
  } catch {
    console.log("Error while connecting to mongo db");
    await client.close();
  }
}
export default run;
