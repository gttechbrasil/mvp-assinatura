import { GroupStatus, MemberStatus, TransactionType, TransactionStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Clean existing data in order of foreign key dependencies
  console.log("🧹 Cleaning database...");
  await prisma.groupMember.deleteMany();
  await prisma.groupInvite.deleteMany();
  await prisma.groupView.deleteMany();
  await prisma.subscriptionGroup.deleteMany();
  await prisma.platformService.deleteMany();
  await prisma.category.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.user.deleteMany();
  console.log("✅ Database cleaned.");

  // 2. Load existing categories from CSV if available
  const oldCategories: { [name: string]: string } = {};
  const csvPath = path.join(process.cwd(), "prisma", "old_categories.csv");
  if (fs.existsSync(csvPath)) {
    console.log("📖 Loading existing categories and icons from CSV...");
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const lines = csvContent.split("\n").slice(1); // skip header
    for (const line of lines) {
      if (!line.trim()) continue;
      // Simple parse for name,icon (CSV format)
      const firstComma = line.indexOf(",");
      if (firstComma === -1) continue;
      let name = line.substring(0, firstComma).trim();
      let icon = line.substring(firstComma + 1).trim();
      // Remove surrounding quotes if any
      if (name.startsWith('"') && name.endsWith('"')) name = name.substring(1, name.length - 1);
      if (icon.startsWith('"') && icon.endsWith('"')) icon = icon.substring(1, icon.length - 1);
      oldCategories[name] = icon;
    }
  }

  // 3. Create Categories
  console.log("📂 Creating categories...");
  const catStreaming = await prisma.category.create({
    data: {
      name: "Streaming",
      icon: oldCategories["Streaming"] || "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMzYjgyZjYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHJ4PSIyLjE4IiByeT0iMi4xOCIvPjxsaW5lIHgxPSI3IiB5MT0iMiIgeDI9IjciIHkyPSIyMiIvPjxsaW5lIHgxPSIxNyIgeTE9IjIiIHgyPSIxNyIgeTI9IjIyIi8+PGxpbmUgeDE9IjIiIHkxPSIxMiIgeDI9IjIyIiB5Mj0iMTIiLz48bGluZSB4MT0iMiIgeTE9IjciIHgyPSI3IiB5Mj0iNyIvPjxsaW5lIHgxPSIyIiB5MT0iMTciIHgyPSI3IiB5Mj0iMTciLz48bGluZSB4MT0iMTciIHkxPSIxNyIgeDI9IjIyIiB5Mj0iMTciLz48bGluZSB4MT0iMTciIHkxPSI3IiB5Mj0iMjIiIHkyPSI3Ii8+PC9zdmc+",
    },
  });

  const catMusica = await prisma.category.create({
    data: {
      name: "Música",
      icon: oldCategories["Música"] || "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNOSAxOFY1bDEyLTJ2MTMiLz48Y2lyY2xlIGN4PSI2IiBjeT0iMTgiIHI9IjMiLz48Y2lyY2xlIGN4PSIxOCIgY3k9IjE2IiByPSIzIi8+PC9zdmc+",
    },
  });

  const catGames = await prisma.category.create({
    data: {
      name: "Games",
      icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmNTllMGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIyIiB5PSI2IiB3aWR0aD0iMjAiIGhlaWdodD0iMTIiIHJ4PSIyIi8+PHBhdGggZD0iTTYgMTJoNE04IDEwdjRNMTUgMTFoLjAxTTE4IDEzaC4wMSIvPjwvc3ZnPg==",
    },
  });

  const catTrabalho = await prisma.category.create({
    data: {
      name: "Trabalho e Estudos",
      icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4YjVjZjYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNCAxOS41QTIuNSAyLjUgMCAwIDEgNi41IDE3SDIwdjNINi41YTIuNSAyLjUgMCAwIDAtMi41IDIuNXoiLz48cGF0aCBkPSJNNCAxOS41di0xNUEyLjUgMi41IDAgMCAxIDYuNSAyRDIwdjE1SDYuNWEyLjUgMi41IDAgMCAwLTIuNSAyLjF6Ii8+PC9zdmc+",
    },
  });

  // 4. Create Platform Services
  console.log("🛠️ Creating platform services...");
  const services = [
    // Streaming de Vídeo
    { name: "Netflix", description: "Netflix - Compartilhamento do plano Premium 4K", categoryId: catStreaming.id },
    { name: "Prime Video", description: "Amazon Prime Video - Filmes, séries e frete grátis", categoryId: catStreaming.id },
    { name: "Disney+", description: "Disney+ - Filmes, séries e canais ESPN ao vivo", categoryId: catStreaming.id },
    { name: "Max", description: "Max - Conteúdos HBO, Warner Bros, Discovery e Champions League", categoryId: catStreaming.id },
    // Música
    { name: "Spotify", description: "Spotify Premium - Músicas sem anúncios e modo offline", categoryId: catMusica.id },
    { name: "YouTube Premium", description: "YouTube Premium - Vídeos sem anúncios e YouTube Music", categoryId: catMusica.id },
    // Trabalho e Estudos
    { name: "Canva Pro", description: "Canva Pro - Recursos premium de design para equipes", categoryId: catTrabalho.id },
    { name: "ChatGPT Plus", description: "ChatGPT Plus - Acesso ao GPT-4, DALL-E e mais inteligência", categoryId: catTrabalho.id },
    // Games
    { name: "Xbox Game Pass", description: "Xbox Game Pass Ultimate - Biblioteca de jogos para console e PC", categoryId: catGames.id }
  ];

  for (const s of services) {
    await prisma.platformService.create({
      data: s
    });
  }

  // 5. Create Users (1 admin, 2 users)
  console.log("👤 Creating users and wallets...");
  const adminPassword = await bcrypt.hash("admin123", 10);
  const joaoPassword = await bcrypt.hash("joao123", 10);
  const mariaPassword = await bcrypt.hash("maria123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@mvpassinatura.com",
      name: "Admin MVP",
      password: adminPassword,
      role: "ADMIN",
      wallet: {
        create: {
          balance: 0.00
        }
      }
    }
  });

  const joao = await prisma.user.create({
    data: {
      email: "joao@exemplo.com",
      name: "João Silva",
      password: joaoPassword,
      role: "USER",
      wallet: {
        create: {
          balance: 0.00
        }
      }
    }
  });

  const maria = await prisma.user.create({
    data: {
      email: "maria@exemplo.com",
      name: "Maria Santos",
      password: mariaPassword,
      role: "USER",
      wallet: {
        create: {
          balance: 0.00
        }
      }
    }
  });

  // 6. Create Groups and Group Members
  console.log("👥 Creating subscription groups...");

  // João's Netflix Group (Maria is a member)
  const groupNetflix = await prisma.subscriptionGroup.create({
    data: {
      name: "Netflix Premium 4K",
      service: "Netflix",
      description: "Grupo para compartilhar assinatura Premium 4K da Netflix. Vagas individuais com perfis separados.",
      maxSlots: 4,
      pricePerSlot: 14.90,
      status: GroupStatus.ACTIVE,
      ownerId: joao.id,
      categoryId: catStreaming.id,
    }
  });

  await prisma.groupMember.create({
    data: {
      groupId: groupNetflix.id,
      userId: maria.id,
      status: MemberStatus.ACTIVE,
    }
  });

  // Maria's Spotify Group (João is a member)
  const groupSpotify = await prisma.subscriptionGroup.create({
    data: {
      name: "Spotify Família",
      service: "Spotify",
      description: "Vagas no plano familiar do Spotify. Cada um usa sua própria conta pessoal sem misturar nada.",
      maxSlots: 5,
      pricePerSlot: 7.90,
      status: GroupStatus.ACTIVE,
      ownerId: maria.id,
      categoryId: catMusica.id,
    }
  });

  await prisma.groupMember.create({
    data: {
      groupId: groupSpotify.id,
      userId: joao.id,
      status: MemberStatus.ACTIVE,
    }
  });

  // Admin's Xbox Game Pass (Empty)
  await prisma.subscriptionGroup.create({
    data: {
      name: "Xbox Game Pass Ultimate",
      service: "Xbox Game Pass",
      description: "Divisão do plano Xbox Game Pass Ultimate. Compartilhamento simples definindo console principal.",
      maxSlots: 2,
      pricePerSlot: 25.00,
      status: GroupStatus.ACTIVE,
      ownerId: admin.id,
      categoryId: catGames.id,
    }
  });

  // João's Canva Pro (Empty)
  await prisma.subscriptionGroup.create({
    data: {
      name: "Canva Pro para Times",
      service: "Canva Pro",
      description: "Vagas para equipe no Canva Pro. Acesso a todos os recursos premium do Canva.",
      maxSlots: 5,
      pricePerSlot: 12.00,
      status: GroupStatus.ACTIVE,
      ownerId: joao.id,
      categoryId: catTrabalho.id,
    }
  });

  console.log("🎉 Database successfully seeded!");
  console.log("\n🔑 Login Credentials:");
  console.log("-----------------------------------------");
  console.log("1. ADMIN:");
  console.log("   Email:    admin@mvpassinatura.com");
  console.log("   Password: admin123");
  console.log("   Balance:  R$ 0,00");
  console.log("-----------------------------------------");
  console.log("2. USER JOÃO:");
  console.log("   Email:    joao@exemplo.com");
  console.log("   Password: joao123");
  console.log("   Balance:  R$ 0,00");
  console.log("-----------------------------------------");
  console.log("3. USER MARIA:");
  console.log("   Email:    maria@exemplo.com");
  console.log("   Password: maria123");
  console.log("   Balance:  R$ 0,00");
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
