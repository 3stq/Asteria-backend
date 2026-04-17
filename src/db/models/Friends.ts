import { Schema, model, Document } from "mongoose"

interface IFriendEntry {
  accountId: string
}

interface IFriendList {
  accepted: IFriendEntry[]
  incoming: IFriendEntry[]
  outgoing: IFriendEntry[]
  blocked: IFriendEntry[]
}

export interface IFriends extends Document {
  created: Date
  accountId: string
  list: IFriendList
}

const FriendsSchema = new Schema<IFriends>(
  {
    created: { type: Date, required: true },
    accountId: { type: String, required: true, unique: true },
    list: {
      type: Object,
      default: {
        accepted: [],
        incoming: [],
        outgoing: [],
        blocked: []
      }
    }
  },
  {
    collection: "friends"
  }
)

const Friends = model<IFriends>("Friends", FriendsSchema)

export default Friends
