const mongoose = require("mongoose");
const env = require("./env");

mongoose.set("strictQuery", true);
mongoose.set("bufferCommands", false);

let listenersBound = false;
let configLogged = false;

function isConnected() {
  return mongoose.connection.readyState === 1;
}

function logConfigOnce() {
  if (configLogged) return;
  configLogged = true;
  console.log("[config] MONGODB_URI configured:", env.mongodbUriFromEnv);
  console.log("[config] JWT_SECRET configured:", env.jwtSecretFromEnv);
  console.log("[config] CLIENT_URL configured:", Boolean(process.env.CLIENT_URL));
}

function bindListeners() {
  if (listenersBound) return;
  listenersBound = true;
  mongoose.connection.on("error", (err) => {
    console.error("[db] MongoDB connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.error("[db] MongoDB disconnected");
  });
}

async function connectDb(uri = env.mongodbUri) {
  bindListeners();
  logConfigOnce();

  if (isConnected()) {
    return mongoose.connection;
  }

  console.log("[db] Connecting to MongoDB…");

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
  } catch (err) {
    console.error("[db] MongoDB connection failed.");
    console.error("[db] Start MongoDB locally or set MONGODB_URI in aadhya/.env");
    console.error("[db] Details:", err.message);
    throw err;
  }

  if (!isConnected()) {
    throw new Error("MongoDB reported connected but readyState is not open.");
  }

  console.log("[db] MongoDB connected");
  return mongoose.connection;
}

function retryConnect(uri = env.mongodbUri, delayMs = 5000) {
  setTimeout(async () => {
    if (isConnected()) return;
    try {
      await connectDb(uri);
    } catch {
      retryConnect(uri, delayMs);
    }
  }, delayMs);
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb, isConnected, retryConnect };
