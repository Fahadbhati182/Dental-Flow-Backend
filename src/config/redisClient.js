import { createClient } from "redis";

const redisClient = createClient({
  username: "default",
  password: "3jdwvMnnldIYmCcqpXMZNhikbRehUMVD",
  socket: {
    host: "redis-16359.crce217.ap-south-1-1.ec2.cloud.redislabs.com",
    port: 16359,
  },
});

redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

await redisClient.connect();

export default redisClient;
