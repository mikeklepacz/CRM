import { storage } from "../../storage";

export async function handleReminderCalendarExport(req: any, res: any): Promise<any> {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
    const tenantId = req.user.tenantId;
    const reminders = await storage.getRemindersByUser(userId, tenantId);

    const activeReminders = reminders.filter((r) => r.isActive && r.nextTrigger);

    const icsLines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Hemp Wick CRM//Sales Dashboard//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    const formatICalDate = (date: Date): string => {
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
    };

    for (const reminder of activeReminders) {
      if (!reminder.nextTrigger) continue;
      const now = new Date();
      const triggerDate = new Date(reminder.nextTrigger);

      icsLines.push("BEGIN:VEVENT");
      icsLines.push(`UID:${reminder.id}@hempwickcrm.app`);
      icsLines.push(`DTSTAMP:${formatICalDate(now)}`);
      icsLines.push(`DTSTART:${formatICalDate(triggerDate)}`);
      icsLines.push(`SUMMARY:${reminder.title.replace(/[,;\\]/g, "\\$&")}`);

      if (reminder.description) {
        const cleanDesc = reminder.description.replace(/[,;\\]/g, "\\$&").replace(/\n/g, "\\n");
        icsLines.push(`DESCRIPTION:${cleanDesc}`);
      }

      if (triggerDate < now) {
        icsLines.push("PRIORITY:1");
      }

      icsLines.push("STATUS:CONFIRMED");
      icsLines.push("END:VEVENT");
    }

    icsLines.push("END:VCALENDAR");
    const icsContent = icsLines.join("\r\n");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"reminders.ics\"");
    res.send(icsContent);
  } catch (error: any) {
    console.error("Error exporting calendar:", error);
    res.status(500).json({ message: error.message || "Failed to export calendar" });
  }
}
