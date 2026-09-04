import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "./src/config/prisma.js";

const seedUsers = async () => {
  try {
    const passwordHash = await bcrypt.hash("password123", 12);
    
    // Admin / Gov User
    await prisma.user.upsert({
      where: { phone: "9999999999" },
      update: {},
      create: {
        name: "Gov Admin",
        phone: "9999999999",
        email: "admin@gov.in",
        passwordHash,
        role: "GOVERNMENT"
      }
    });

    // Operator User
    const opUser = await prisma.user.upsert({
      where: { phone: "8888888888" },
      update: {},
      create: {
        name: "Centre Operator",
        phone: "8888888888",
        email: "operator@gov.in",
        passwordHash,
        role: "OPERATOR"
      }
    });

    // We need to link the operator to a centre if one exists
    const centre = await prisma.procurementCentre.findFirst();
    if (centre) {
      const existingOp = await prisma.centreOperator.findUnique({ where: { userId: opUser.id } });
      if (!existingOp) {
        await prisma.centreOperator.create({
          data: {
            userId: opUser.id,
            centreId: centre.id,
            operatorCode: "OP-001"
          }
        });
      }
    }

    console.log("✅ Government and Operator accounts seeded successfully!");
    console.log("Login Info:");
    console.log("Govt: Phone 9999999999, Password: password123");
    console.log("Oper: Phone 8888888888, Password: password123");

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
};
seedUsers();
