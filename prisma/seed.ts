import { Equipment, PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const users = [
  { id: "student-1", name: "Alex Student", role: Role.STUDENT },
  { id: "student-2", name: "Maria Student", role: Role.STUDENT },
  { id: "admin-1", name: "Admin User", role: Role.ADMIN },
];

const rooms = [
  {
    id: "room-101",
    name: "Auditorium 101",
    capacity: 30,
    equipment: [Equipment.PROJECTOR, Equipment.WHITEBOARD],
  },
  {
    id: "room-102",
    name: "Auditorium 102",
    capacity: 50,
    equipment: [Equipment.COMPUTERS, Equipment.PROJECTOR],
  },
  {
    id: "hall-main",
    name: "Grand Conference Hall",
    capacity: 150,
    equipment: [Equipment.PROJECTOR, Equipment.WHITEBOARD],
  },
];

async function main() {
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { name: user.name, role: user.role },
      create: user,
    });
  }

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { id: room.id },
      update: {
        name: room.name,
        capacity: room.capacity,
        equipment: room.equipment,
      },
      create: room,
    });
  }

  console.log(`Seeded ${users.length} users and ${rooms.length} rooms.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
