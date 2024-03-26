import express from "express";
import { createServer as createHttpServer } from "http";
import { Socket, Server as SocketServer } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import MediaBrokerClient from "./media-broker-client";
import { createClient } from "redis";
import configuration from "./configuration";
import ConnectionRepository from "./connection-repository";
import { wrapResultAsync } from "./utils/result";

(async () => {
  const application = express();
  const httpServer = createHttpServer(application);
  const socketServer = new SocketServer(httpServer);
  const mediaBrokerClient = new MediaBrokerClient();
  const connectionRepository = new ConnectionRepository();
  const redisSubscriber = createClient();
  await redisSubscriber.connect();

  application.get("/meetings/:meetingId", async (request, response) => {
    response.json(await wrapResultAsync(async () => {
      const meetingId = request.params.meetingId;

      return await mediaBrokerClient.getMeetingInfo(meetingId);
    }));
  });

  application.post("/meetings/start", async (request, response) => {
    response.json(await wrapResultAsync(async () => {
      const username = request.headers["x-username"];

      const result = await mediaBrokerClient.startMeeting(username);

      connectionRepository.openMeeting(result.meetingId);

      return result;
    }));
  });

  application.post("/meetings/:meetingId/end", async (request, response) => {
    response.json(await wrapResultAsync(async () => {
      const username = request.headers["x-username"];
      const meetingId = request.params.meetingId;

      const result = await mediaBrokerClient.endMeeting(meetingId, username);

      connectionRepository.closeMeeting(meetingId);
      socketServer.to(meetingId).emit("meetingEnded");

      return result;
    }));
  });

  socketServer.on("connection", (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, { meetingId?: any }>) => {
    const username = socket.handshake.headers["x-username"];

    if (!username) {
      socket.disconnect(true);
    }

    socket.on("sendMessage", ({ message }) => {
      if (socket.data.meetingId) {
        socketServer.to(socket.data.meetingId).emit("messageSent", {
          sender: username,
          message: message
        });
      }
    });

    socket.on("disconnect", async () => {
      if (socket.data.meetingId) {
        try {
          await mediaBrokerClient.leaveMeeting(socket.data.meetingId, username);
        } catch (error) {
          console.error(error);
        }

        connectionRepository.closeAttendee(socket.data.meetingId, username);

        socket.leave(socket.data.meetingId);

        socketServer.to(socket.data.meetingId).emit("attendeeDisconnected", {
          attendeeId: username
        });
      }
    });

    socket.on("joinMeeting", async ({ meetingId }, callback) => {
      callback(await wrapResultAsync(async () => {
        if (socket.data.meetingId) {
          throw "You have already joined a meeting";
        }
  
        const result = await mediaBrokerClient.joinMeeting(meetingId, username);
  
        socket.join(meetingId);
        socket.data.meetingId = meetingId;

        connectionRepository.openAttendee(meetingId, username, socket.id);

        socketServer.to(meetingId).emit("attendeeJoined", {
          attendeeId: username
        });
  
        return result;
      }));
    });

    socket.on("connectTransport", async ({ transportType, dtlsParameters }, callback) => {
      callback(await wrapResultAsync(async () => {
        if (!socket.data.meetingId) {
          throw "You haven't join a meeting yet";
        }
  
        return await mediaBrokerClient.connectTransport(socket.data.meetingId, username, transportType, dtlsParameters);
      }));
    });

    socket.on("leaveMeeting", async (_, callback) => {
      callback(await wrapResultAsync(async () => {
        if (!socket.data.meetingId) {
          throw "You haven't join a meeting yet";
        }
  
        const result = await mediaBrokerClient.leaveMeeting(socket.data.meetingId, username);
  
        connectionRepository.closeAttendee(socket.data.meetingId, username);

        socket.leave(socket.data.meetingId);
        socketServer.to(socket.data.meetingId).emit("attendeeLeft", {
          attendeeId: username
        });

        socket.data.meetingId = undefined;
  
        return result;
      }));
    });

    socket.on("produceMedia", async ({ appData, rtpParameters }, callback) => {
      callback(await wrapResultAsync(async () => {
        if (!socket.data.meetingId) {
          throw "You haven't join a meeting yet";
        }
  
        const result = await mediaBrokerClient.produceMedia(socket.data.meetingId, username, appData, rtpParameters);
        
        socketServer.to(socket.data.meetingId).emit("producerCreated", {
          attendeeId: username,
          producerId: result.producerId
        });
  
        return result;
      }));
    });

    socket.on("closeProducer", async ({ producerType }, callback) => {
      callback(await wrapResultAsync(async () => {
        if (!socket.data.meetingId) {
          throw "You haven't join a meeting yet";
        }
  
        return await mediaBrokerClient.closeProducer(socket.data.meetingId, username, producerType);
      }));
    });

    socket.on("pauseProducer", async ({ producerType }, callback) => {
      callback(await wrapResultAsync(async () => {
        if (!socket.data.meetingId) {
          throw "You haven't join a meeting yet";
        }
  
        return await mediaBrokerClient.pauseProducer(socket.data.meetingId, username, producerType);
      }));
    });

    socket.on("resumeProducer", async ({ producerType }, callback) => {
      callback(await wrapResultAsync(async () => {
        if (!socket.data.meetingId) {
          throw "You haven't join a meeting yet";
        }
  
        return await mediaBrokerClient.resumeProducer(socket.data.meetingId, username, producerType);
      }));
    });

    socket.on("consumeMedia", async ({ producerId, rtpCapabilities }, callback) => {
      callback(await wrapResultAsync(async () => {
        if (!socket.data.meetingId) {
          throw "You haven't join a meeting yet";
        }
  
        return await mediaBrokerClient.consumeMedia(socket.data.meetingId, username, producerId, rtpCapabilities);
      }));
    });

    socket.on("pauseConsumer", async ({ consumerId }, callback) => {
      callback(await wrapResultAsync(async () => {
        if (!socket.data.meetingId) {
          throw "You haven't join a meeting yet";
        }
  
        return await mediaBrokerClient.pauseConsumer(socket.data.meetingId, username, consumerId);
      }));
    });

    socket.on("resumeConsumer", async ({ consumerId }, callback) => {
      callback(await wrapResultAsync(async () => {
        if (!socket.data.meetingId) {
          throw "You haven't join a meeting yet";
        }
  
        return await mediaBrokerClient.resumeConsumer(socket.data.meetingId, username, consumerId);
      }));
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