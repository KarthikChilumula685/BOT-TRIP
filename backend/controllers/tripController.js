import Trip from "../models/Trip.js";
import Memory from "../models/Memory.js";

function serializeTrip(trip) {
  return {
    _id: trip._id,
    name: trip.name,
    description: trip.description,
    coverPhotoId: trip.coverPhotoId,
    startDate: trip.startDate,
    endDate: trip.endDate,
    location: trip.location,
    createdBy: trip.createdBy,
    isPublic: trip.isPublic,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt
  };
}

export async function createTrip(req, res, next) {
  try {
    const { name, description, startDate, endDate, location, isPublic } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Trip name is required" });
    }

    const trip = new Trip({
      name: name.trim(),
      description: description?.trim() || "",
      startDate: startDate || new Date(),
      endDate: endDate || null,
      location: location?.trim() || "",
      createdBy: req.user._id,
      isPublic: isPublic || false
    });

    await trip.save();

    res.status(201).json({ trip: serializeTrip(trip) });
  } catch (error) {
    next(error);
  }
}

export async function getTrips(req, res, next) {
  try {
    const trips = await Trip.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    // Get memory counts for each trip
    const tripsWithCounts = await Promise.all(
      trips.map(async (trip) => {
        const photoCount = await Memory.countDocuments({
          tripId: trip._id,
          type: "photo"
        });
        const videoCount = await Memory.countDocuments({
          tripId: trip._id,
          type: "video"
        });

        // Get date range
        const dateRange = await Memory.aggregate([
          { $match: { tripId: trip._id } },
          {
            $group: {
              _id: null,
              minDate: { $min: "$memoryDate" },
              maxDate: { $max: "$memoryDate" }
            }
          }
        ]);

        return {
          ...serializeTrip(trip),
          photoCount,
          videoCount,
          dateRange: dateRange[0] ? {
            start: dateRange[0].minDate,
            end: dateRange[0].maxDate
          } : null
        };
      })
    );

    res.json({ trips: tripsWithCounts });
  } catch (error) {
    next(error);
  }
}

export async function getTrip(req, res, next) {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Get memory counts
    const photoCount = await Memory.countDocuments({
      tripId: trip._id,
      type: "photo"
    });
    const videoCount = await Memory.countDocuments({
      tripId: trip._id,
      type: "video"
    });

    // Get date range
    const dateRange = await Memory.aggregate([
      { $match: { tripId: trip._id } },
      {
        $group: {
          _id: null,
          minDate: { $min: "$memoryDate" },
          maxDate: { $max: "$memoryDate" }
        }
      }
    ]);

    res.json({
      trip: {
        ...serializeTrip(trip),
        photoCount,
        videoCount,
        dateRange: dateRange[0] ? {
          start: dateRange[0].minDate,
          end: dateRange[0].maxDate
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTrip(req, res, next) {
  try {
    const { name, description, startDate, endDate, location, isPublic, coverPhotoId } = req.body;

    const trip = await Trip.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    if (name !== undefined) trip.name = name.trim();
    if (description !== undefined) trip.description = description?.trim() || "";
    if (startDate !== undefined) trip.startDate = startDate;
    if (endDate !== undefined) trip.endDate = endDate;
    if (location !== undefined) trip.location = location?.trim() || "";
    if (isPublic !== undefined) trip.isPublic = isPublic;
    if (coverPhotoId !== undefined) trip.coverPhotoId = coverPhotoId;

    await trip.save();

    res.json({ trip: serializeTrip(trip) });
  } catch (error) {
    next(error);
  }
}

export async function deleteTrip(req, res, next) {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Update all memories in this trip to remove tripId
    await Memory.updateMany(
      { tripId: trip._id },
      { $unset: { tripId: "" } }
    );

    await Trip.deleteOne({ _id: trip._id });

    res.json({ message: "Trip deleted successfully" });
  } catch (error) {
    next(error);
  }
}

export async function getTripMemories(req, res, next) {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const {
      search = "",
      type,
      sort = "memoryDate",
      order = "desc",
      page = 1,
      limit = 20
    } = req.query;

    const query = { tripId: trip._id };

    if (search) {
      query.$or = [
        { caption: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { fileName: { $regex: search, $options: "i" } }
      ];
    }

    if (type) {
      query.type = type;
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const memories = await Memory.find(query)
      .sort({ [sort]: sortOrder })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("uploadedBy", "name avatar")
      .populate("likes", "name avatar")
      .lean();

    const total = await Memory.countDocuments(query);

    res.json({
      memories: memories.map((m) => ({
        ...m,
        isLiked: m.likes?.some(
          (id) => (typeof id === "string" ? id : id._id) === req.user._id
        )
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
}
