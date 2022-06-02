import { model, Schema, Types } from "mongoose";


interface IExercise {
    user_id: Types.ObjectId,
    description: string,
    duration: number,
    date: Date
}

const exerciseSchema = new Schema<IExercise>({
    user_id: { type: Schema.Types.ObjectId, ref: 'User',required: true },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: Date, required: true, default: Date.now }
});

const Exercise = model<IExercise>('Exercise', exerciseSchema);


export { IExercise };
export default Exercise;