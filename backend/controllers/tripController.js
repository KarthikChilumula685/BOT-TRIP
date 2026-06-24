import Trip from "../models/Trip.js";
import Memory from "../models/Memory.js";
import User from "../models/User.js";
import { deleteFromDrive } from "../config/googleDrive.js";

// Helper function to select random cover photo
async function updateTripCoverPhoto(tripId) {
  try {
    // Find all photos in this trip
    const photos = await Memory.find({
      tripId: tripId,
      type: "photo"
    })
      .lean();

    const trip = await Trip.findById(tripId);

    if (photos.length > 0) {
      // Select a random photo as cover
      const randomIndex = Math.floor(Math.random() * photos.length);
      trip.coverPhotoId = photos[randomIndex]._id;
    } else {
      // No photos in the trip, clear cover
      trip.coverPhotoId = null;
    }

    await trip.save();
    return trip.coverPhotoId;
  } catch (error) {
    console.error("Error updating trip cover photo:", error);
    return null;
  }
}

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
      isPublic: isPublic !== undefined ? isPublic : true
    });

    await trip.save();

    res.status(201).json({ trip: serializeTrip(trip) });
  } catch (error) {
    next(error);
  }
}

export async function getTrips(req, res, next) {
  try {
    const trips = await Trip.find({})
      .sort({ createdAt: -1 })
      .lean();

    // Get memory counts for each trip and update cover photos
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

        // Update cover photo with random selection
        const updatedCoverId = await updateTripCoverPhoto(trip._id);

        return {
          ...serializeTrip({ ...trip, coverPhotoId: updatedCoverId }),
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
    const trip = await Trip.findById(req.params.id)
      .populate("createdBy", "name avatar")
      .lean();

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

    const trip = await Trip.findById(req.params.id);

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
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Permission check: only creator or admin can delete
    if (trip.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "You don't have permission to delete this trip" });
    }

    // Find all memories in this trip
    const memories = await Memory.find({ tripId: trip._id }).lean();

    // Delete all Google Drive files for these memories
    const deleteFilePromises = memories.map(async (memory) => {
      try {
        if (memory.fileId) {
          await deleteFromDrive(memory.fileId);
        }
      } catch (error) {
        console.error(`Failed to delete file ${memory.fileId} from Drive:`, error);
        // Continue with deletion even if file deletion fails
      }
    });

    await Promise.all(deleteFilePromises);

    // Delete all memory records (this cascades to embedded comments, likes, reactions)
    await Memory.deleteMany({ tripId: trip._id });

    // Delete the trip itself
    await Trip.deleteOne({ _id: trip._id });

    res.json({ 
      message: "Trip and all associated memories deleted successfully",
      deletedMemoriesCount: memories.length
    });
  } catch (error) {
    next(error);
  }
}

export async function getTripMemories(req, res, next) {
  try {
    const trip = await Trip.findById(req.params.id).lean();

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
