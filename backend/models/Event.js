import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Event name is required"],
      trim: true,
    },
    series: {
      type: String,
      required: true,
      enum: ["Formula 1", "MotoGP", "WEC", "IndyCar", "Formula E", "Other"],
    },
    status: {
      type: String,
      enum: ["live", "upcoming", "completed"],
      default: "upcoming",
      index: true,
    },
    displayTime: {
      type: String,    // Human readable: "Today, 14:00 GMT"
      required: true,
    },
    isoTime: {
      type: Date,
      default: null,
    },
    circuit: {
      type: String,
      trim: true,
    },
    badge: {
      type: String,
      default: null,
    },
    badgeColor: {
      type: String,
      enum: ["red", "yellow", "green", "blue", null],
      default: null,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

const Event = mongoose.model("Event", eventSchema);
export default Event;