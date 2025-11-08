import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion {
  type: 'one' | 'many';
  options: string[];
}

export interface IPoll extends Document {
  id: string;
  creator: string;
  topic: string;
  reward: number;
  createdAt: string;
  activeUntill: string;
  questions: IQuestion[];
}

const QuestionSchema: Schema = new Schema({
  type: { 
    type: String, 
    enum: ['one', 'many'], 
    required: true 
  },
  options: [{ 
    type: String, 
    required: true 
  }]
});

const PollSchema: Schema = new Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  creator: { 
    type: String, 
    required: true 
  },
  topic: { 
    type: String, 
    required: true 
  },
  reward: { 
    type: Number, 
    required: true 
  },
  createdAt: { 
    type: String, 
    required: true 
  },
  activeUntill: { 
    type: String, 
    required: true 
  },
  questions: [QuestionSchema]
}, {
  timestamps: true
});

export default mongoose.model<IPoll>('Poll', PollSchema);