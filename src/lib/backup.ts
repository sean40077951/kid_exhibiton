import { prisma } from "@/lib/prisma";

// 備份 Event/SessionTemplate/Session/Booking 這幾張真正的營運資料表，
// 存成一筆 SystemBackup 快照，不用靠 Zeabur 付費方案的自動備份功能。
export async function createBackupSnapshot() {
  const [events, sessionTemplates, sessions, bookings] = await Promise.all([
    prisma.event.findMany(),
    prisma.sessionTemplate.findMany(),
    prisma.session.findMany(),
    prisma.booking.findMany()
  ]);

  const rowCounts = {
    events: events.length,
    sessionTemplates: sessionTemplates.length,
    sessions: sessions.length,
    bookings: bookings.length
  };

  return prisma.systemBackup.create({
    data: {
      data: { events, sessionTemplates, sessions, bookings },
      rowCounts
    }
  });
}
