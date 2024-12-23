import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import { injectable } from "tsyringe";

@injectable()
export class MeetingApi {
  constructor(@InjectAxios() private axios: Axios) {}

  findAttendees({ meetingId, ...query }: { remoteId?: string; meetingId: number }) {
    return this.axios.get(`/meetings/${meetingId}/attendees`, { params: query }).then((res) => res.data);
  }
}
