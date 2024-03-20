import axios from "axios";
import configuration from "./configuration";
import { Result } from "./utils/result";

export default class MediaBrokerClient {
  private readonly _url: string;

  public constructor() {
    this._url = `${configuration.mediaBroker.host}:${configuration.mediaBroker.port}`;
  }

  public async getMeetingInfo(meetingId: any): Promise<Result<any>> {
    try {
      const response = await axios({
        url: `${this._url}/meetings/${meetingId}`,
        method: "get",
        headers: {
          "Content-Type": "application/json"
        }
      });

      return response.data;
    } catch (error) {
      return {
        status: "failed",
        message: error
      };
    }
  }

  public async startMeeting(attendeeId: any): Promise<Result<{ meetingId: any }>> {
    try {
      const response = await axios({
        url: `${this._url}/meetings/start`,
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "x-username": attendeeId
        }
      });

      return response.data;
    } catch (error) {
      return {
        status: "failed",
        message: error
      };
    }
  }

  public async endMeeting(meetingId: any, attendeeId: any): Promise<Result<any>> {
    try {
      const response = await axios({
        url: `${this._url}/meetings/${meetingId}/end`,
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "x-username": attendeeId
        }
      });

      return response.data;
    } catch (error) {
      return {
        status: "failed",
        message: error
      };
    }
  }

  public async joinMeeting(meetingId: any, attendeeId: any): Promise<Result<any>> {
    try {
      const response = await axios({
        url: `${this._url}/meetings/${meetingId}/join`,
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "x-username": attendeeId
        }
      });

      return response.data;
    } catch (error) {
      return {
        status: "failed",
        message: error
      };
    }
  }

  public async connectTransport(meetingId: any, attendeeId: any, transportType: any, dtlsParameters: any): Promise<Result<any>> {
    try {
      const response = await axios({
        url: `${this._url}/meetings/${meetingId}/connect`,
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "x-username": attendeeId
        },
        data: {
          transportType: transportType,
          dtlsParameters: dtlsParameters
        }
      });

      return response.data;
    } catch (error) {
      return {
        status: "failed",
        message: error
      };
    }
  }

  public async leaveMeeting(meetingId: any, attendeeId: any): Promise<Result<any>> {
    try {
      const response = await axios({
        url: `${this._url}/meetings/${meetingId}/leave`,
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "x-username": attendeeId
        }
      });

      return response.data;
    } catch (error) {
      return {
        status: "failed",
        message: error
      };
    }
  }

  public async produceMedia(meetingId: any, attendeeId: any, appData: any, rtpParameters: any): Promise<Result<{ producerId: string }>> {
    try {
      const response = await axios({
        url: `${this._url}/meetings/${meetingId}/produceMedia`,
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "x-username": attendeeId
        },
        data: {
          appData: appData,
          rtpParameters: rtpParameters
        }
      });

      return response.data;
    } catch (error) {
      return {
        status: "failed",
        message: error
      };
    }
  }

  public async closeProducer(meetingId: any, attendeeId: any, producerType: any): Promise<Result<any>> {
    try {
      const response = await axios({
        url: `${this._url}/meetings/${meetingId}/closeProducer`,
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "x-username": attendeeId
        },
        data: {
          producerType: producerType
        }
      });

      return response.data;
    } catch (error) {
      return {
        status: "failed",
        message: error
      };
    }
  }

  public async pauseProducer(meetingId: any, attendeeId: any, producerType: any): Promise<Result<any>> {
    try {
      const response = await axios({
        url: `${this._url}/meetings/${meetingId}/pauseProducer`,
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "x-username": attendeeId
        },
        data: {
          producerType: producerType
        }
      });

      return response.data;
    } catch (error) {
      return {
        status: "failed",
        message: error
      };
    }  
  }

  public async resumeProducer(meetingId: any, attendeeId: any, producerType: any): Promise<Result<any>> {
    try {
      const response = await axios({
        url: `${this._url}/meetings/${meetingId}/resumeProducer`,
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "x-username": attendeeId
        },
        data: {
          producerType: producerType
        }
      });

      return response.data;
    } catch (error) {
      return {
        status: "failed",
        message: error
      };
    }
  }

  public async consumeMedia(meetingId: any, attendeeId: any, producerId: any, rtpCapabilities: any): Promise<Result<any>> {
    try {
      const response = await axios({
        url: `${this._url}/meetings/${meetingId}/consumeMedia`,
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "x-username": attendeeId
        },
        data: {
          producerId: producerId,
          rtpCapabilities: rtpCapabilities
        }
      });

      return response.data;
    } catch (error) {
      return {
        status: "failed",
        message: error
      };
    }
  }

  public async pauseConsumer(meetingId: any, attendeeId: any, consumerId: any): Promise<Result<any>> {
    try {
      const response = await axios({
        url: `${this._url}/meetings/${meetingId}/pauseConsumer`,
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "x-username": attendeeId
        },
        data: {
          consumerId: consumerId
        }
      });

      return response.data;
    } catch (error) {
      return {
        status: "failed",
        message: error
      };
    }
  }

  public async resumeConsumer(meetingId: any, attendeeId: any, consumerId: any): Promise<Result<any>> {
    try {
      const response = await axios({
        url: `${this._url}/meetings/${meetingId}/resumeConsumer`,
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "x-username": attendeeId
        },
        data: {
          consumerId: consumerId
        }
      });

      return response.data;
    } catch (error) {
      return {
        status: "failed",
        message: error
      };
    }
  }
}