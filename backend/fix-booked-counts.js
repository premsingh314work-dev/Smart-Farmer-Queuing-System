import "dotenv/config";
import prisma from "./src/config/prisma.js";

async function fix() {
  const slots = await prisma.slot.findMany();
  let updatedCount = 0;
  for (const slot of slots) {
    const count = await prisma.booking.count({ where: { slotId: slot.id, status: { not: 'CANCELLED' } } });
    if (slot.bookedCount !== count) {
      await prisma.slot.update({
        where: { id: slot.id },
        data: { bookedCount: count }
      });
      updatedCount++;
    }
  }
  console.log(`Fixed booked counts for ${updatedCount} slots!`);
}

fix().catch(console.error).finally(() => prisma.$disconnect());
