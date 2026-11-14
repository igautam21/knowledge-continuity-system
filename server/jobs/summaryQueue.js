const { Queue } = require("bullmq");
const redisConnection = require("../config/redis");

const summaryQueue = new Queue("knowledge-summary", {
  connection: redisConnection,
});

module.exports = summaryQueue;