const mongoose = require("mongoose");

const settlementSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
    note: { type: String, trim: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

settlementSchema.set("toJSON", {
  transform: (_, obj) => { delete obj.__v; return obj; }
});

module.exports = mongoose.model("Settlement", settlementSchema);