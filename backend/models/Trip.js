import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    coverPhotoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Memory",
      default: null
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: null
    },
    location: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    isPublic: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Index for efficient queries
tripSchema.index({ createdBy: 1, createdAt: -1 });
tripSchema.index({ startDate: -1 });

export default mongoose.model("Trip", tripSchema);
