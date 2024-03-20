import express from "express";
import { createServer as createHttpServer } from "http";
import { Socket, Server as SocketServer } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import MediaBrokerClient from "./media-broker-client";
import { createClient } from "redis";
import configuration from "./configuration";
import ConnectionRepository from "./connection-repository";

(async () => {
  const application = express();
  const httpServer = createHttpServer(application);
  const socketServer = new SocketServer(httpServer);
  const mediaBrokerClient = new MediaBrokerClient();
  const connectionRepository = new ConnectionRepository();
  const redisSubscriber = createClient();
  await redisSubscriber.connect();

  application.get("/meetings/:meetingId", async (request, response) => {
    const meetingId = request.params.meetingId;

    response.json(await mediaBrokerClient.getMeetingInfo(meetingId));
  });

  application.post("/meetings/start", async (request, response) => {
    const username = request.headers["x-username"];

    const startingResult = await mediaBrokerClient.startMeeting(username);

    if (startingResult.status === "success") {
      connectionRepository.openMeeting(startingResult.data.meetingId);
    }

    response.json(startingResult);
  });

  application.post("/meetings/:meetingId/end", async (request, response) => {
    const username = request.headers["x-username"];
    const meetingId = request.params.meetingId;

    const endingResult = await mediaBrokerClient.endMeeting(meetingId, username);

    if (endingResult.status === "success") {
      connectionRepository.closeMeeting(meetingId);
      socketServer.to(meetingId).emit("meetingEnded");
    }

    response.json(endingResult);
  });

  socketServer.on("connection", (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, { meetingId?: any }>) => {
    const username = socket.handshake.headers["x-username"];

    if (!username) {
      socket.disconnect(true);
    }

    socket.on("disconnect", async () => {
      if (socket.data.meetingId) {
        await mediaBrokerClient.leaveMeeting(socket.data.meetingId, username);

        connectionRepository.closeAttendee(socket.data.meetingId, username);

        socket.leave(socket.data.meetingId);

        socketServer.to(socket.data.meetingId).emit("attendeeDisconnected", {
          attendeeId: username
        });
      }
    });

    socket.on("joinMeeting", async ({ meetingId }, callback) => {
      if (socket.data.meetingId) {
        callback({
          status: "failed",
          message: "You have already joined a meeting"
        });
        return;
      }

      const joiningResult = await mediaBrokerClient.joinMeeting(meetingId, username);

      if (joiningResult.status === "success") {
        socket.join(meetingId);
        socket.data.meetingId = meetingId;

        connectionRepository.openAttendee(meetingId, username, socket.id);

        socketServer.to(meetingId).emit("attendeeJoined", {
          attendeeId: username
        });
      }

      callback(joiningResult);
    });

    socket.on("connectTransport", async ({ transportType, dtlsParameters }, callback) => {
      if (!socket.data.meetingId) {
        callback({
          status: "failed",
          message: "You haven't join a meeting yet"
        });
        return;
      }

      callback(await mediaBrokerClient.connectTransport(socket.data.meetingId, username, transportType, dtlsParameters));
    });

    socket.on("leaveMeeting", async (_, callback) => {
      if (!socket.data.meetingId) {
        callback({
          status: "failed",
          message: "You haven't join a meeting yet"
        });
        return;
      }

      const leavingResult = await mediaBrokerClient.leaveMeeting(socket.data.meetingId, username);

      if (leavingResult.status === "success") {
        connectionRepository.closeAttendee(socket.data.meetingId, username);

        socket.leave(socket.data.meetingId);

        socketServer.to(socket.data.meetingId).emit("attendeeLeft", {
          attendeeId: username
        });

        socket.data.meetingId = undefined;
      }

      callback(leavingResult);
    });

    socket.on("produceMedia", async ({ appData, rtpParameters }, callback) => {
      if (!socket.data.meetingId) {
        callback({
          status: "failed",
          message: "You haven't join a meeting yet"
        });
        return;
      }

      const producerResult = await mediaBrokerClient.produceMedia(socket.data.meetingId, username, appData, rtpParameters);

      if (producerResult.status === "success") {
        const producerId = producerResult.data.producerId;

        socketServer.to(socket.data.meetingId).emit("producerCreated", {
          attendeeId: username,
          producerId: producerId
        });
      }

      callback(producerResult);
    });

    socket.on("closeProducer", async ({ producerType }, callback) => {
      if (!socket.data.meetingId) {
        callback({
          status: "failed",
          message: "You haven't join a meeting yet"
        });
        return;
      }

      callback(await mediaBrokerClient.closeProducer(socket.data.meetingId, username, producerType));
    });

    socket.on("pauseProducer", async ({ producerType }, callback) => {
      if (!socket.data.meetingId) {
        callback({
          status: "failed",
          message: "You haven't join a meeting yet"
        });
        return;
      }

      callback(await mediaBrokerClient.pauseProducer(socket.data.meetingId, username, producerType));
    });

    socket.on("resumeProducer", async ({ producerType }, callback) => {
      if (!socket.data.meetingId) {
        callback({
          status: "failed",
          message: "You haven't join a meeting yet"
        });
        return;
      }

      callback(await mediaBrokerClient.resumeProducer(socket.data.meetingId, username, producerType));
    });

    socket.on("consumeMedia", async ({ producerId, rtpCapabilities }, callback) => {
      if (!socket.data.meetingId) {
        callback({
          status: "failed",
          message: "You haven't join a meeting yet"
        });
        return;
      }

      callback(await mediaBrokerClient.consumeMedia(socket.data.meetingId, username, producerId, rtpCapabilities));
    });

    socket.on("pauseConsumer", async ({ consumerId }, callback) => {
      if (!socket.data.meetingId) {
        callback({
          status: "failed",
          message: "You haven't join a meeting yet"
        });
        return;
      }

      callback(await mediaBrokerClient.pauseConsumer(socket.data.meetingId, username, consumerId));
    });

    socket.on("resumeConsumer", async ({ consumerId }, callback) => {
      if (!socket.data.meetingId) {
        callback({
          status: "failed",
          message: "You haven't join a meeting yet"
        });
        return;
      }

      callback(await mediaBrokerClient.resumeConsumer(socket.data.meetingId, username, consumerId));
    });
  });

  await redisSubscriber.subscribe("guggle-weed-sfu", (message) => {
    const { event, payload } = JSON.parse(message);

    switch (event) {
      case "attendeeError":
        {
          const { meetingId, attendeId } = payload;
          socketServer.to(meetingId).emit("attendeeError", {
            attendeId
          });
        }
        break;
      case "producerClosed":
        {
          const { meetingId, attendeeId, producerType, producerId } = payload;
          const socketId = connectionRepository.getSocketId(meetingId, attendeeId);

          if (socketId) {
            socketServer.to(socketId).emit("producerClosed", {
              producerType, producerId
            });
          }
        }
        break;
      case "producerPaused":
        {
          const { meetingId, attendeeId, producerType, producerId } = payload;
          const socketId = connectionRepository.getSocketId(meetingId, attendeeId);

          if (socketId) {
            socketServer.to(socketId).emit("producerPaused", {
              producerType, producerId
            });
          }
        }
        break;
      case "producerResumed":
        {
          const { meetingId, attendeeId, producerType, producerId } = payload;
          const socketId = connectionRepository.getSocketId(meetingId, attendeeId);

          if (socketId) {
            socketServer.to(socketId).emit("producerResumed", {
              producerType, producerId
            });
          }
        }
        break;
      case "consumerClosed":
        {
          const { meetingId, attendeeId, consumerId } = payload;
          const socketId = connectionRepository.getSocketId(meetingId, attendeeId);

          if (socketId) {
            socketServer.to(socketId).emit("consumerClosed", {
              consumerId
            });
          }
        }
        break;
      case "consumerPaused":
        {
          const { meetingId, attendeeId, consumerId } = payload;
          const socketId = connectionRepository.getSocketId(meetingId, attendeeId);

          if (socketId) {
            socketServer.to(socketId).emit("consumerPaused", {
              consumerId
            });
          }
        }
        break;
      case "consumerResumed":
        {
          const { meetingId, attendeeId, consumerId } = payload;
          const socketId = connectionRepository.getSocketId(meetingId, attendeeId);

          if (socketId) {
            socketServer.to(socketId).emit("consumerResumed", {
              consumerId
            });
          }
        }
        break;  
    }
  });

  httpServer.listen(configuration.server.listenPort, () => {
    console.log(`Server is running at http://${configuration.server.listenIp}:${configuration.server.listenPort}`);
  });
})()