const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: "👥" },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

groupSchema.set("toJSON", {
  transform: (_, obj) => { delete obj.__v; return obj; }
});

module.exports = mongoose.model("Group", groupSchema);