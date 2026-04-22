const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    color: {
      type: String,
      default: () => {
        const colors = ["#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#3b82f6", "#ec4899"];
        return colors[Math.floor(Math.random() * colors.length)];
      },
    },
    avatar: { type: String, default: "" },
    currency: { type: String, default: "INR" },
    upiId: { type: String, default: "" },
    notificationsEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.virtual("initials").get(function () {
  return this.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
});

userSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => {
    delete obj.password;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model("User", userSchema);