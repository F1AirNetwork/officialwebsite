import Event from "../models/Event.js";
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendCreated,
} from "../utils/response.js";

// ─── GET /api/events ──────────────────────────
// Public. Supports ?status=live|upcoming|completed and ?series=Formula+1
export const getAllEvents = async (req, res) => {
  try {
    const { status, series, limit } = req.query;
    const filter = {};

    if (status)  filter.status = status;
    if (series)  filter.series = series;

    let query = Event.find(filter).sort({ featured: -1, isoTime: 1 });
    if (limit)   query = query.limit(parseInt(limit));

    const events = await query;
    return sendSuccess(res, { count: events.length, events });
  } catch (err) {
    return sendError(res, "Failed to fetch events.");
  }
};

// ─── GET /api/events/live ─────────────────────
// Public. All currently live events.
export const getLiveEvents = async (req, res) => {
  try {
    const events = await Event.find({ status: "live" }).sort({ featured: -1 });
    return sendSuccess(res, { count: events.length, events });
  } catch (err) {
    return sendError(res, "Failed to fetch live events.");
  }
};

// ─── GET /api/events/upcoming ─────────────────
// Public. Upcoming events sorted by time.
export const getUpcomingEvents = async (req, res) => {
  try {
    const events = await Event.find({ status: "upcoming" }).sort({ isoTime: 1 });
    return sendSuccess(res, { count: events.length, events });
  } catch (err) {
    return sendError(res, "Failed to fetch upcoming events.");
  }
};

// ─── GET /api/events/:id ──────────────────────
// Public.
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return sendNotFound(res, "Event not found.");
    return sendSuccess(res, event);
  } catch (err) {
    return sendError(res, "Failed to fetch event.");
  }
};

// ─── POST /api/events ─────────────────────────
// Admin only.
export const createEvent = async (req, res) => {
  try {
    const event = await Event.create(req.body);
    return sendCreated(res, event, "Event created");
  } catch (err) {
    return sendError(res, "Failed to create event.");
  }
};

// ─── PUT /api/events/:id ──────────────────────
// Admin only.
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!event) return sendNotFound(res, "Event not found.");
    return sendSuccess(res, event, "Event updated");
  } catch (err) {
    return sendError(res, "Failed to update event.");
  }
};

// ─── DELETE /api/events/:id ───────────────────
// Admin only.
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return sendNotFound(res, "Event not found.");
    return sendSuccess(res, null, "Event deleted");
  } catch (err) {
    return sendError(res, "Failed to delete event.");
  }
};