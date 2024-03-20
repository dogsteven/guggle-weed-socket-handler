export default class ConnectionRepository {
  private readonly _connections: Map<any, Map<any, any>>;

  public constructor() {
    this._connections = new Map<any, Map<any, any>>();
  }

  public getSocketId(meetingId: any, attendeeId: any): any {
    if (!this._connections.has(meetingId)) {
      return null;
    }

    const map = this._connections.get(meetingId);

    if (!map.has(attendeeId)) {
      return null;
    }

    return map.get(attendeeId);
  }

  public openMeeting(meetingId: any) {
    if (this._connections.has(meetingId)) {
      return;
    }

    this._connections.set(meetingId, new Map<any, any>());
  }

  public closeMeeting(meetingId: any) {
    this._connections.delete(meetingId);
  }

  public openAttendee(meetingId: any, attendeeId: any, socketId: any) {
    if (!this._connections.has(meetingId)) {
      return;
    }

    const map = this._connections.get(meetingId);

    if (map.has(attendeeId)) {
      return;
    }

    map.set(attendeeId, socketId);
  }

  public closeAttendee(meetingId: any, attendeeId: any) {
    if (!this._connections.has(meetingId)) {
      return;
    }

    const map = this._connections.get(meetingId);

    map.delete(attendeeId);
  }

  
}