import express from "express";
import { createServer as createHttpServer } from "http";
import { Socket, Server as SocketServer } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import MediaBrokerClient from "./media-broker-client";
import { createClient } from "redis";
import configuration from "./configuration";
import ConnectionRepository from "./connection-repository";
import { wrapResultAsync } from "./utils/result";
import cors from "cors";
import { json } from "body-parser";

(async () => {
  const application = express();
  const httpServer = createHttpServer(application);
  const socketServer = new SocketServer(httpServer, {
    cors: {
      origin: "https://localhost:3000",
      methods: ["get", "post"],
      allowedHeaders: ["x-username", "x-meeting-id"],
      credentials: true
    }
  });
  const mediaBrokerClient = new MediaBrokerClient();
  const connectionRepository = new ConnectionRepository();
  const redisSubscriber = createClient();
  await redisSubscriber.connect();

  application.use(json());

  application.use(cors({
    origin: "https://localhost:3000",
    methods: ["get", "post"],
    allowedHeaders: ["x-username", "x-meeting-id"]
  }));

  application.get("/meetings/:meetingId", async (request, response) => {
    response.json(await wrapResultAsync(async () => {
      const meetingId = request.params.meetingId;

      return await mediaBrokerClient.getMeetingInfo(meetingId);
    }));
  });

  application.get("/meetings/:meetingId/hostId", async (request, response) => {
    response.json(await wrapResultAsync(async () => {
      const meetingId = request.params.meetingId;

      return await mediaBrokerClient.getMeetingHostId(meetingId);
    }));
  });

  application.get("/meetings/:meetingId/hostId", async (request, response) => {
    response.json(await wrapResultAsync(async () => {
      const meetingId = request.params.meetingId;

      return await mediaBrokerClient.getMeetingAttendees(meetingId);
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

  socketServer.on("connection", (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, { joined: boolean }>) => {
    socket.data.joined = false;
    const username = socket.handshake.headers["x-username"] as string;
    const meetingId = socket.handshake.headers["x-meeting-id"] as string;

    if (!username) {
      socket.disconnect(true);
    }

    socket.on("sendMessage", ({ message }) => {
      if (socket.data.joined) {
        socketServer.to(meetingId).emit("messageSent", {
          sender: username,
          message: message
        });
      }
    });

    socket.on("disconnect", async () => {
      if (socket.data.joined) {
        try {
          await mediaBrokerClient.leaveMeeting(meetingId, username);
        } catch (error) {
        }

        connectionRepository.closeAttendee(meetingId, username);

        socket.leave(meetingId);
        socket.data.joined = false;

        socketServer.to(meetingId).emit("attendeeDisconnected", {
          attendeeId: username
        });
      }
    });

    socket.on("join", async (_, callback) => {
      callback(await wrapResultAsync(async () => {
        if (socket.data.joined) {
          throw new Error("You have already joined this meeting");
        }
  
        const result = await mediaBrokerClient.joinMeeting(meetingId, username);

        connectionRepository.openAttendee(meetingId, username, socket.id);
  
        socket.join(meetingId);
        socket.data.joined = true;

        socketServer.to(meetingId).emit("attendeeJoined", {
          attendeeId: username
        });
  
        return result;
      }));
    });

    socket.on("connectTransport", async ({ transportType, dtlsParameters }, callback) => {
      callback(await wrapResultAsync(async () => {
        if (!socket.data.joined) {
          throw new Error("You haven't join this meeting yet");
        }
  
        return await mediaBrokerClient.connectTransport(meetingId, username, transportType, dtlsParameters);
      }));
    });

    socket.on("leave", async (_, callback) => {
      callback(await wrapResultAsync(async () => {
        if (!socket.data.joined) {
          throw new Error("You haven't join this meeting yet");
        }
  
        const result = await mediaBrokerClient.leaveMeeting(meetingId, username);
  
        connectionRepository.closeAttendee(meetingId, username);

        socket.leave(meetingId);
        socket.data.joined = false;

        socketServer.to(meetingId).emit("attendeeLeft", {
          attendeeId: username
        });
  
        return result;
      }));
    });

    socket.on("produceMedia", async ({ appData, rtpParameters }, callback) => {
      callback(await wrapResultAsync(async () => {
        if (!socket.data.joined) {
          throw new Error("You haven't join this meeting yet");
        }
  
        const result = await mediaBrokerClient.produceMedia(meetingId, username, appData, rtpParameters);
        
        socket.to(meetingId).emit("producerCreated", {
          attendeeId: username,
          producerId: result.producerId
        });
  
        return result;
      }));
    });

    socket.on("closeProducer", async ({ producerType }, callback) => {
      callback(await wrapResultAsync(async () => {
        if (!socket.data.joined) {
          throw new Error("You haven't join this meeting yet");
        }
  
        return await mediaBrokerClient.closeProducer(meetingId, username, producerType);
      }));
    });

    socket.on("pauseProducer", async ({ producerType }, callback) => {
      callback(await wrapResultAsync(async () => {
        if (!socket.data.joined) {
          throw new Error("You haven't join this meeting yet");
        }
  
        return await mediaBrokerClient.pauseProducer(meetingId, username, producerType);
      }));
    });

    socket.on("resumeProducer", async ({ producerType }, callback) => {
      callback(await wrapResultAsync(async () => {
        if (!socket.data.joined) {
          throw new Error("You haven't join this meeting yet");
        }
  
        return await mediaBrokerClient.resumeProducer(meetingId, username, producerType);
      }));
    });

    socket.on("consumeMedia", async ({ producerId, rtpCapabilities }, callback) => {
      callback(await wrapResultAsync(async () => {
        if (!socket.data.joined) {
          throw new Error("You haven't join this meeting yet");
        }
  
        return await mediaBrokerClient.consumeMedia(meetingId, username, producerId, rtpCapabilities);
      }));
    });

    socket.on("closeConsumer", async ({ consumerId }) => {
      if (!socket.data.joined) {
        return;
      }

      await mediaBrokerClient.closeConsumer(meetingId, username, consumerId);
    });

    socket.on("pauseConsumer", async ({ consumerId }) => {
      if (!socket.data.joined) {
        return;
      }

      await mediaBrokerClient.pauseConsumer(meetingId, username, consumerId);
    });

    socket.on("resumeConsumer", async ({ consumerId }) => {
      if (!socket.data.joined) {
        return;
      }

      await mediaBrokerClient.resumeConsumer(meetingId, username, consumerId);
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