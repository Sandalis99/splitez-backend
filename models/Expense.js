const mongoose = require("mongoose");

const splitSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    category: {
      type: String,
      enum: ["Food", "Travel", "Rent", "Utilities", "Entertainment", "Shopping", "Other"],
      default: "Other",
    },
    date: { type: Date, default: Date.now },
    splits: [splitSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

expenseSchema.set("toJSON", {
  transform: (_, obj) => { delete obj.__v; return obj; }
});

module.exports = mongoose.model("Expense", expenseSchema);