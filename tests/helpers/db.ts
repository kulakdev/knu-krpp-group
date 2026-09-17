import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Integration tests use their own PrismaClient (not the lib/ singleton) and
 * reset to a deterministic dataset before each file: the seeded users and
 * rooms, and zero bookings.
 *
 * Prerequisite: `docker compose up -d db` + `npx prisma migrate deploy`
 * (automated in CI; see README).
 */
export const testPrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export async function resetDatabase(): Promise<void> {
  await testPrisma.booking.deleteMany();

  for (const user of [
    { id: "student-1", name: "Alex Student", role: Role.STUDENT },
    { id: "student-2", name: "Maria Student", role: Role.STUDENT },
    { id: "admin-1", name: "Admin User", role: Role.ADMIN },
  ]) {
    await testPrisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    });
  }

  for (const room of [
    { id: "room-101", name: "Auditorium 101", capacity: 30 },
    { id: "room-102", name: "Auditorium 102", capacity: 50 },
    { id: "hall-main", name: "Grand Conference Hall", capacity: 150 },
  ]) {
    await testPrisma.room.upsert({
      where: { id: room.id },
      update: {},
      create: room,
    });
  }
}
