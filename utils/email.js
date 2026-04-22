const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendExpenseNotification({ expense, group, payer, members }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const recipients = members.filter(
    (m) => m.notificationsEnabled && m.email !== payer.email
  );
  if (!recipients.length) return;

  for (const member of recipients) {
    const myShare = expense.splits?.find(
      (s) => s.user?.toString() === member._id?.toString()
    )?.amount || 0;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#080d1a;color:#e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#10b981,#0891b2);padding:24px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#fff;">⚡ splitez</div>
          <div style="color:rgba(255,255,255,0.8);margin-top:4px;font-size:14px;">New expense added</div>
        </div>
        <div style="padding:28px;">
          <p style="color:#94a3b8;font-size:14px;">Hi ${member.name},</p>
          <p style="color:#e2e8f0;font-size:15px;margin-bottom:24px;">
            <strong>${payer.name}</strong> added a new expense in <strong>${group.name}</strong>:
          </p>
          <div style="background:#0f1829;border:1px solid #1a2540;border-radius:12px;padding:20px;margin-bottom:24px;">
            <div style="font-size:18px;font-weight:700;color:#e2e8f0;">${expense.description}</div>
            <div style="color:#475569;font-size:13px;margin-top:6px;">${expense.category} • ${new Date(expense.date).toLocaleDateString("en-IN")}</div>
            <div style="margin-top:16px;display:flex;justify-content:space-between;">
              <div>
                <div style="font-size:11px;color:#475569;">Total amount</div>
                <div style="font-size:20px;font-weight:700;color:#e2e8f0;">₹${expense.amount.toLocaleString("en-IN")}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:11px;color:#475569;">Your share</div>
                <div style="font-size:20px;font-weight:700;color:#ef4444;">₹${myShare.toLocaleString("en-IN")}</div>
              </div>
            </div>
          </div>
          <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}"
            style="display:block;background:linear-gradient(135deg,#10b981,#0891b2);color:#fff;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
            View in Splitez →
          </a>
        </div>
        <div style="padding:16px 28px;border-top:1px solid #1a2540;text-align:center;">
          <p style="color:#334155;font-size:11px;">You received this because you are a member of ${group.name}.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Splitez ⚡" <${process.env.EMAIL_USER}>`,
      to: member.email,
      subject: `💸 ${payer.name} added "${expense.description}" in ${group.name}`,
      html,
    });
  }
}

async function sendSettlementNotification({ from, to, amount }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  if (!to.notificationsEnabled) return;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#080d1a;color:#e2e8f0;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#10b981,#0891b2);padding:24px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#fff;">⚡ splitez</div>
        <div style="color:rgba(255,255,255,0.8);margin-top:4px;font-size:14px;">Payment received</div>
      </div>
      <div style="padding:28px;">
        <p style="color:#94a3b8;font-size:14px;">Hi ${to.name},</p>
        <p style="color:#e2e8f0;font-size:15px;margin:16px 0;">
          <strong>${from.name}</strong> has recorded a payment to you:
        </p>
        <div style="background:#0f1829;border:1px solid #10b98133;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <div style="font-size:32px;font-weight:700;color:#10b981;">₹${amount.toLocaleString("en-IN")}</div>
          <div style="color:#475569;font-size:13px;margin-top:6px;">settled on ${new Date().toLocaleDateString("en-IN")}</div>
        </div>
        <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}"
          style="display:block;background:linear-gradient(135deg,#10b981,#0891b2);color:#fff;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:600;">
          View in Splitez →
        </a>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Splitez ⚡" <${process.env.EMAIL_USER}>`,
    to: to.email,
    subject: `💸 ${from.name} paid you ₹${amount.toLocaleString("en-IN")}`,
    html,
  });
}

module.exports = { sendExpenseNotification, sendSettlementNotification };