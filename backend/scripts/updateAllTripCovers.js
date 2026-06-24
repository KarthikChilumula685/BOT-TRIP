import mongoose from "mongoose";
import dotenv from "dotenv";
import Trip from "../models/Trip.js";
import Memory from "../models/Memory.js";

dotenv.config();

async function updateAllTripCovers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Get all trips
    const trips = await Trip.find({});
    console.log(`Found ${trips.length} trips to update`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const trip of trips) {
      console.log(`\nProcessing trip: ${trip.name} (${trip._id})`);

      // Find all photos in this trip, sorted by likes (descending) and then by upload date (descending)
      const photos = await Memory.find({
        tripId: trip._id,
        type: "photo"
      })
        .sort({ "likes.length": -1, createdAt: -1 })
        .limit(1)
        .lean();

      if (photos.length > 0) {
        // Set the most-liked photo as cover
        const bestPhoto = photos[0];
        trip.coverPhotoId = bestPhoto._id;
        await trip.save();
        
        console.log(`  ✓ Updated cover to photo with ${bestPhoto.likes?.length || 0} likes`);
        updatedCount++;
      } else {
        // No photos in the trip, clear cover
        if (trip.coverPhotoId) {
          trip.coverPhotoId = null;
          await trip.save();
          console.log(`  ✓ Cleared cover (no photos in trip)`);
          updatedCount++;
        } else {
          console.log(`  - Skipped (no photos and no cover)`);
          skippedCount++;
        }
      }
    }

    console.log(`\n\nUpdate Summary:`);
    console.log(`- Trips updated: ${updatedCount}`);
    console.log(`- Trips skipped: ${skippedCount}`);
    console.log(`- Total trips processed: ${trips.length}`);
    console.log("\n✅ All trip covers updated successfully!");

    process.exit(0);
  } catch (error) {
    console.error("Update failed:", error);
    process.exit(1);
  }
}

updateAllTripCovers();
