import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    }
  },
  { timestamps: true }
);

const memorySchema = new mongoose.Schema(
  {
    fileId: { type: String, required: true, unique: true, index: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    previewUrl: { type: String, required: true },
    downloadUrl: { type: String, required: true },
    type: {
      type: String,
      enum: ["photo", "video"],
      required: true,
      index: true
    },
    conversionStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "completed"
    },
    thumbnailUrl: {
      type: String,
      default: ""
    },
    title: { type: String, trim: true, maxlength: 100, default: "" },
    caption: { type: String, trim: true, maxlength: 300, default: "" },
    location: { type: String, trim: true, maxlength: 120, default: "" },
    tripName: { type: String, trim: true, maxlength: 120, default: "" },
    memoryDate: { type: Date, default: Date.now, index: true },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [commentSchema]
  },
  { timestamps: true }
);

memorySchema.index({
  caption: "text",
  location: "text",
  fileName: "text",
  tripName: "text"
});

export default mongoose.model("Memory", memorySchema);
