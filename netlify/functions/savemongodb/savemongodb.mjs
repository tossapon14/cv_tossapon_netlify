import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const time_zone = process.env.TIME_ZONE || "Asia/Bangkok";
const client = new MongoClient(uri);

let dbConnection;

async function connectToDatabase() {
  if (dbConnection) return dbConnection;
  await client.connect();
  dbConnection = client.db(process.env.MONGODB_DATABASE);
  return dbConnection;
}

const handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const data = JSON.parse(event.body);
    // console.log("Received data:", data);
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION);
    const database = await collection.find({ visitor_ip: data.ip }).toArray();
    if (database.length > 0) {
      await collection.updateOne(
        { visitor_ip: data.ip },   // find by IP
        {
          $push: {
            project_visit: {
              timestamp: new Date().toLocaleString('en-US', {
                timeZone: time_zone
              }),
              page: data.pageName
            }
          }
        },
        { upsert: false } // create new doc if none exists

      );
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Existing users, the system will update..",
        }),
      }
    } else {
      const dateTime = new Date().toLocaleString('en-US', {
        timeZone: time_zone
      });
      var datainsert = {
        first_date: dateTime,
        visitor_ip: data.ip,
        project_visit: [{
          timestamp: dateTime,
          page: "home"
        }]
      }
      await collection.insertOne(datainsert)
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "New users will be added by the system.",
        }),
      }
    }
  } catch (e) {
    console.error("Error inserting data:", e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
export { handler };