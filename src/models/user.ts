import { model, Schema, Types } from "mongoose";


interface IUser {
    _id: Types.ObjectId
    username: string,
}

const userSchema = new Schema<IUser>({
    username: { type: String, required: true, unique: true }
});

const User = model<IUser>('User', userSchema);


export { IUser };
export default User;