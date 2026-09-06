import prisma from "../config/prisma.js";

export const notifyAffectedFarmers = async (io, centreId, specificBookingId = null) => {
  if (!io) return;
  
  try {
    const activeEntries = await prisma.queueEntry.findMany({
      where: {
        centreId: centreId,
        status: {
          in: ["WAITING", "CALLED", "SERVING"]
        }
      },
      include: {
        booking: {
          include: {
            farmer: true
          }
        }
      }
    });

    const usersToNotify = new Set();
    
    // Add all active users
    activeEntries.forEach(entry => {
      if (entry.booking && entry.booking.farmer) {
        usersToNotify.add(entry.booking.farmer.userId);
      }
    });

    // Add the specific user whose status just changed (e.g. COMPLETED, NO_SHOW)
    if (specificBookingId) {
      const specificEntry = await prisma.booking.findUnique({
        where: { id: specificBookingId },
        include: { farmer: true }
      });
      if (specificEntry && specificEntry.farmer) {
        usersToNotify.add(specificEntry.farmer.userId);
      }
    }

    // Also notify operators at this centre
    io.to(`centre:${centreId}`).emit("queue:updated", {
      type: "QUEUE_STATE_CHANGE",
      centreId
    });

    // Notify each farmer individually
    usersToNotify.forEach(userId => {
      io.to(`user:${userId}`).emit("queue:updated", {
        type: "QUEUE_STATE_CHANGE",
        centreId
      });
    });
  } catch (error) {
    console.error("Error notifying affected farmers:", error);
  }
};
