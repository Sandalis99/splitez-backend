const router = require("express").Router();
const Expense = require("../models/Expense");
const Group = require("../models/Group");
const Settlement = require("../models/Settlement");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const { sendExpenseNotification } = require("../utils/email");

const populateExpense = (q) =>
  q.populate("paidBy", "name email color")
   .populate("splits.user", "name email color")
   .populate("group", "name icon");

// GET /api/expenses/balances/me
router.get("/balances/me", protect, async (req, res) => {
  try {
    const userGroups = await Group.find({ members: req.user._id }).select("_id");
    const expenses = await Expense.find({ group: { $in: userGroups.map((g) => g._id) } });
    const settlements = await Settlement.find({
      $or: [{ from: req.user._id }, { to: req.user._id }],
    });
    const pairs = {};
    expenses.forEach((e) => {
      e.splits.forEach((s) => {
        const uid = s.user.toString();
        const payerId = e.paidBy.toString();
        const myId = req.user._id.toString();
        if (uid === payerId) return;
        if (payerId === myId && uid !== myId) pairs[uid] = (pairs[uid] || 0) + s.amount;
        else if (uid === myId && payerId !== myId) pairs[payerId] = (pairs[payerId] || 0) - s.amount;
      });
    });
    settlements.forEach((s) => {
      const from = s.from.toString(), to = s.to.toString(), myId = req.user._id.toString();
      if (from === myId) pairs[to] = (pairs[to] || 0) + s.amount;
      if (to === myId) pairs[from] = (pairs[from] || 0) - s.amount;
    });
    res.json(pairs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/expenses
router.get("/", protect, async (req, res) => {
  try {
    const { groupId } = req.query;
    let query = {};
    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) return res.status(404).json({ message: "Group not found" });
      if (!group.members.map(String).includes(req.user._id.toString()))
        return res.status(403).json({ message: "Not a member" });
      query.group = groupId;
    } else {
      const userGroups = await Group.find({ members: req.user._id }).select("_id");
      query.group = { $in: userGroups.map((g) => g._id) };
    }
    const expenses = await populateExpense(Expense.find(query)).sort("-date");
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/expenses
router.post("/", protect, async (req, res) => {
  try {
    const { description, amount, paidBy, group, category, date, splits } = req.body;
    if (!description || !amount || !paidBy || !group || !splits?.length)
      return res.status(400).json({ message: "Missing required fields" });

    const grp = await Group.findById(group).populate("members");
    if (!grp) return res.status(404).json({ message: "Group not found" });
    if (!grp.members.map((m) => m._id.toString()).includes(req.user._id.toString()))
      return res.status(403).json({ message: "Not a member" });

    const expense = await Expense.create({
      description, amount, paidBy, group, category,
      splits, date: date || new Date(), createdBy: req.user._id,
    });

    const populated = await populateExpense(Expense.findById(expense._id));

    // Send email notifications (don't await — fire and forget)
    try {
      const payer = await User.findById(paidBy);
      const members = await User.find({ _id: { $in: grp.members.map((m) => m._id) } });
      sendExpenseNotification({ expense, group: grp, payer, members }).catch(console.error);
    } catch (e) { /* email errors shouldn't break the request */ }

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/expenses/:id - EDIT expense
router.put("/:id", protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    const isCreator = expense.createdBy?.toString() === req.user._id.toString();
    const isPayer = expense.paidBy?.toString() === req.user._id.toString();
    if (!isCreator && !isPayer)
      return res.status(403).json({ message: "Not authorized to edit this expense" });

    const allowed = ["description", "amount", "paidBy", "category", "date", "splits"];
    allowed.forEach((f) => { if (req.body[f] !== undefined) expense[f] = req.body[f]; });
    await expense.save();

    res.json(await populateExpense(Expense.findById(expense._id)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/expenses/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    const isCreator = expense.createdBy?.toString() === req.user._id.toString();
    const isPayer = expense.paidBy?.toString() === req.user._id.toString();
    if (!isCreator && !isPayer)
      return res.status(403).json({ message: "Not authorized to delete this expense" });
    await expense.deleteOne();
    res.json({ message: "Expense deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;