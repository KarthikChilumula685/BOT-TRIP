import Memory from "../models/Memory.js";
import User from "../models/User.js";

export async function getUsers(_req, res, next) {
  try {
    const users = await User.aggregate([
      {
        $lookup: {
          from: "memories",
          localField: "_id",
          foreignField: "uploadedBy",
          as: "uploads"
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          profileImage: 1,
          role: 1,
          createdAt: 1,
          uploadCount: { $size: "$uploads" }
        }
      },
      { $sort: { name: 1 } }
    ]);
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req, res, next) {
  try {
    const user = await User.findById(req.params.id).select("name email profileImage role createdAt");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "You cannot remove yourself" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const uploadCount = await Memory.countDocuments({ uploadedBy: user._id });
    if (uploadCount) {
      return res.status(409).json({
        message: "Remove this member's memories before removing their account"
      });
    }

    await Promise.all([
      Memory.updateMany(
        {},
        {
          $pull: {
            likes: user._id,
            comments: { user: user._id }
          }
        }
      ),
      user.deleteOne()
    ]);
    res.json({ message: "Member removed" });
  } catch (error) {
    next(error);
  }
}
