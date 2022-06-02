import { model, Schema, Types } from "mongoose";


interface IUser {
    _id: Types.ObjectId
    username: string,
}

const userSchema = new Schema<IUser>({
    username: { type: String, required: true, unique: true }
});
userSchema.methods.toJSON = function(): Object {
    return { username: this.username, _id: this._id };
}

const User = model<IUser>('User', userSchema);


export { IUser };
export default User;