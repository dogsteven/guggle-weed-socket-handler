import axios from "axios";
import configuration from "./configuration";
import { unwrapResult } from "./utils/result";

export default class MediaBrokerClient {
  private readonly _url: string;

  public constructor() {
    this._url = `${configuration.mediaBroker.host}:${configuration.mediaBroker.port}`;
  }

  public async getMeetingAttendees(meetingId: any): Promise<any> {
    const response = await axios({
      url: `${this._url}/meetings/${meetingId}/attendees`,
      method: "get",
      headers: {
        "Content-Type": "application/json"
      }
    });

    return unwrapResult(response.data);
  }

  public async startMeeting(): Promise<{ meetingId: any }> {
    const response = await axios({
      url: `${this._url}/meetings/start`,
      method: "post",
      headers: {
        "Content-Type": "application/json",
      }
    });

    return unwrapResult(response.data);
  }

  public async endMeeting(meetingId: any): Promise<any> {
    const response = await axios({
      url: `${this._url}/meetings/${meetingId}/end`,
      method: "post",
      headers: {
        "Content-Type": "application/json",
      }
    });

    return unwrapResult(response.data);
  }

  public async joinMeeting(meetingId: any, attendeeId: any): Promise<any> {
    const response = await axios({
      url: `${this._url}/meetings/${meetingId}/join`,
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "x-username": attendeeId
      }
    });

    return unwrapResult(response.data);
  }

  public async connectTransport(meetingId: any, attendeeId: any, transportType: any, dtlsParameters: any): Promise<any> {
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

    return unwrapResult(response.data);
  }

  public async leaveMeeting(meetingId: any, attendeeId: any): Promise<any> {
    const response = await axios({
      url: `${this._url}/meetings/${meetingId}/leave`,
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "x-username": attendeeId
      }
    });

    return unwrapResult(response.data);
  }

  public async produceMedia(meetingId: any, attendeeId: any, appData: any, rtpParameters: any): Promise<{ producerId: string }> {
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

    return unwrapResult(response.data);
  }

  public async closeProducer(meetingId: any, attendeeId: any, producerType: any): Promise<any> {
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

    return unwrapResult(response.data);
  }

  public async pauseProducer(meetingId: any, attendeeId: any, producerType: any): Promise<any> {
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

    return unwrapResult(response.data);
  }

  public async resumeProducer(meetingId: any, attendeeId: any, producerType: any): Promise<any> {
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

    return unwrapResult(response.data);
  }

  public async consumeMedia(meetingId: any, attendeeId: any, producerId: any, rtpCapabilities: any): Promise<any> {
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

    return unwrapResult(response.data);
  }

  public async closeConsumer(meetingId: any, attendeeId: any, consumerId: any): Promise<any> {
    const response = await axios({
      url: `${this._url}/meetings/${meetingId}/closeConsumer`,
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "x-username": attendeeId
      },
      data: {
        consumerId: consumerId
      }
    });

    return unwrapResult(response.data);
  }

  public async pauseConsumer(meetingId: any, attendeeId: any, consumerId: any): Promise<any> {
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

    return unwrapResult(response.data);
  }

  public async resumeConsumer(meetingId: any, attendeeId: any, consumerId: any): Promise<any> {
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

    return unwrapResult(response.data);
  }
}