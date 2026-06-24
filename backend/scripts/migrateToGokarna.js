import mongoose from "mongoose";
import dotenv from "dotenv";
import Trip from "../models/Trip.js";
import Memory from "../models/Memory.js";
import User from "../models/User.js";

dotenv.config();

async function migrateToGokarna() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Check if Gokarna trip already exists
    let gokarnaTrip = await Trip.findOne({ name: "Gokarna" });
    
    if (gokarnaTrip) {
      console.log("Gokarna trip already exists. Using existing trip.");
    } else {
      // Get the first user as the creator (for the createdBy field)
      const firstUser = await User.findOne();
      
      if (!firstUser) {
        console.error("No users found in the database. Cannot create trip.");
        process.exit(1);
      }

      // Create Gokarna trip
      gokarnaTrip = new Trip({
        name: "Gokarna",
        description: "All memories from before the collection-based organization system",
        location: "Gokarna, India",
        startDate: new Date(),
        createdBy: firstUser._id,
        isPublic: true
      });

      await gokarnaTrip.save();
      console.log("Created Gokarna trip:", gokarnaTrip._id);
    }

    // Find all memories without a tripId
    const memoriesWithoutTrip = await Memory.find({ tripId: { $exists: false } });
    console.log(`Found ${memoriesWithoutTrip.length} memories without a tripId`);

    if (memoriesWithoutTrip.length === 0) {
      console.log("No memories to migrate. All memories already have a tripId.");
      process.exit(0);
    }

    // Update all memories to have the Gokarna tripId
    const updateResult = await Memory.updateMany(
      { tripId: { $exists: false } },
      { 
        $set: { 
          tripId: gokarnaTrip._id,
          tripName: "Gokarna"
        }
      }
    );

    console.log(`Successfully migrated ${updateResult.modifiedCount} memories to Gokarna trip`);

    // Verify the migration
    const remainingWithoutTrip = await Memory.countDocuments({ tripId: { $exists: false } });
    const memoriesInGokarna = await Memory.countDocuments({ tripId: gokarnaTrip._id });

    console.log(`\nMigration Summary:`);
    console.log(`- Memories migrated: ${updateResult.modifiedCount}`);
    console.log(`- Memories still without trip: ${remainingWithoutTrip}`);
    console.log(`- Total memories in Gokarna: ${memoriesInGokarna}`);

    if (remainingWithoutTrip === 0) {
      console.log("\n✅ Migration successful! All memories now belong to the Gokarna collection.");
    } else {
      console.log("\n⚠️ Migration incomplete. Some memories still lack a tripId.");
    }

    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateToGokarna();
