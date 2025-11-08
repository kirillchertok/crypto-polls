import mongoose, { Schema, Document } from 'mongoose';

export interface IPollResult extends Document {
  pollId: string;
  userWallet: string;
  answers: (string | string[])[];
  timestamp: string;
  rewardClaimed: boolean;
}

const PollResultSchema: Schema = new Schema({
  pollId: { 
    type: String, 
    required: true,
    index: true 
  },
  userWallet: { 
    type: String, 
    required: true,
    index: true 
  },
  answers: [{
    type: Schema.Types.Mixed,
    required: true
  }],
  timestamp: { 
    type: String, 
    required: true 
  },
  rewardClaimed: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true
});

PollResultSchema.index({ pollId: 1, userWallet: 1 }, { unique: true });

export default mongoose.model<IPollResult>('PollResult', PollResultSchema);