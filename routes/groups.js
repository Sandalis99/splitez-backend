const router = require("express").Router();
const Group = require("../models/Group");
const Expense = require("../models/Expense");
const { protect } = require("../middleware/auth");

router.get("/", protect, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate("members", "name email color")
      .populate("createdBy", "name email")
      .sort("-createdAt");
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const { name, icon, members } = req.body;
    if (!name) return res.status(400).json({ message: "Group name is required" });
    const memberIds = [...new Set([req.user._id.toString(), ...(members || [])])];
    const group = await Group.create({ name, icon: icon || "👥", members: memberIds, createdBy: req.user._id });
    await group.populate("members", "name email color");
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members", "name email color")
      .populate("createdBy", "name");
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.members.some((m) => m._id.toString() === req.user._id.toString()))
      return res.status(403).json({ message: "Not a member of this group" });
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Only the creator can edit this group" });
    const allowed = ["name", "icon", "members"];
    allowed.forEach((f) => { if (req.body[f] !== undefined) group[f] = req.body[f]; });
    await group.save();
    await group.populate("members", "name email color");
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Only the creator can delete this group" });
    await Expense.deleteMany({ group: group._id });
    await group.deleteOne();
    res.json({ message: "Group and its expenses deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;