const router = require("express").Router();
const Settlement = require("../models/Settlement");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const { sendSettlementNotification } = require("../utils/email");

router.get("/", protect, async (req, res) => {
  try {
    const settlements = await Settlement.find({
      $or: [{ from: req.user._id }, { to: req.user._id }],
    })
      .populate("from", "name email color")
      .populate("to", "name email color")
      .sort("-date");
    res.json(settlements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const { to, amount, group, note } = req.body;
    if (!to || !amount) return res.status(400).json({ message: "to and amount are required" });
    if (to === req.user._id.toString())
      return res.status(400).json({ message: "Cannot settle with yourself" });

    const settlement = await Settlement.create({ from: req.user._id, to, amount, group, note });
    await settlement.populate("from", "name email color");
    await settlement.populate("to", "name email color");

    // Email notification
    try {
      const toUser = await User.findById(to);
      sendSettlementNotification({ from: req.user, to: toUser, amount }).catch(console.error);
    } catch (e) {}

    res.status(201).json(settlement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const s = await Settlement.findById(req.params.id);
    if (!s) return res.status(404).json({ message: "Settlement not found" });
    if (s.from.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });
    await s.deleteOne();
    res.json({ message: "Settlement deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;