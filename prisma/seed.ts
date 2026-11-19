import { UserRole, BookFormat, AuthorRole, StockMovementType } from '@prisma/client';
import prisma from '../lib/prisma';

async function main() {
  console.log('🌱 Début du peuplement de la base de données (seeding)...');

  // 1. Utilisateurs initiaux (Admin & Libraire)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@librairie.local' },
    update: {},
    create: {
      email: 'admin@librairie.local',
      passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXwOceeaQUg/H4u26z81/Y6Y6l0pG3Uj2O4kK', // hash démo
      firstName: 'Admin',
      lastName: 'Librairie',
      role: UserRole.ADMIN,
    },
  });

  const bookseller = await prisma.user.upsert({
    where: { email: 'libraire@librairie.local' },
    update: {},
    create: {
      email: 'libraire@librairie.local',
      passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXwOceeaQUg/H4u26z81/Y6Y6l0pG3Uj2O4kK',
      firstName: 'Sophie',
      lastName: 'Martin',
      role: UserRole.BOOKSELLER,
    },
  });

  console.log('✓ Utilisateurs créés (admin, libraire)');

  // 2. Client & Profil fidélité
  const customerUser = await prisma.user.upsert({
    where: { email: 'client@example.com' },
    update: {},
    create: {
      email: 'client@example.com',
      passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXwOceeaQUg/H4u26z81/Y6Y6l0pG3Uj2O4kK',
      firstName: 'Jean',
      lastName: 'Dupont',
      phone: '0612345678',
      role: UserRole.CUSTOMER,
      customerProfile: {
        create: {
          loyaltyCardNum: 'FID-2026-0001',
          loyaltyPoints: 120,
          city: 'Paris',
          postalCode: '75005',
          country: 'France',
        },
      },
    },
  });

  console.log('✓ Client et profil fidélité créés');

  // 3. Emplacements en magasin (Rayons)
  const shelfLit = await prisma.shelfLocation.upsert({
    where: {
      zone_aisle_shelf_level: {
        zone: 'Rez-de-chaussée',
        aisle: 'Littérature Classique & Contemporaine',
        shelf: 'Travée 1',
        level: 'Niveau 2',
      },
    },
    update: {},
    create: {
      zone: 'Rez-de-chaussée',
      aisle: 'Littérature Classique & Contemporaine',
      shelf: 'Travée 1',
      level: 'Niveau 2',
      notes: 'Poches et grands formats',
    },
  });

  const shelfBD = await prisma.shelfLocation.upsert({
    where: {
      zone_aisle_shelf_level: {
        zone: 'Mezzanine',
        aisle: 'Bande Dessinée & Manga',
        shelf: 'Bac Franco-Belge',
        level: 'Niveau 1',
      },
    },
    update: {},
    create: {
      zone: 'Mezzanine',
      aisle: 'Bande Dessinée & Manga',
      shelf: 'Bac Franco-Belge',
      level: 'Niveau 1',
    },
  });

  console.log('✓ Emplacements / Rayons créés');

  // 4. Catégories & Rayons thématiques
  const catLitterature = await prisma.category.upsert({
    where: { slug: 'litterature-francaise' },
    update: {},
    create: {
      name: 'Littérature Française',
      slug: 'litterature-francaise',
      description: 'Romans et classiques de la littérature francophone',
    },
  });

  const catBD = await prisma.category.upsert({
    where: { slug: 'bande-dessinee' },
    update: {},
    create: {
      name: 'Bande Dessinée',
      slug: 'bande-dessinee',
      description: 'BD Franco-belge, romans graphiques et comics',
    },
  });

  console.log('✓ Catégories créées');

  // 5. Éditeurs & Collections
  const gallimard = await prisma.publisher.upsert({
    where: { name: 'Éditions Gallimard' },
    update: {},
    create: {
      name: 'Éditions Gallimard',
      website: 'https://www.gallimard.fr',
      contactEmail: 'contact@gallimard.fr',
      collections: {
        create: [{ name: 'Folio' }, { name: 'Blanche' }],
      },
    },
    include: { collections: true },
  });

  const dargaud = await prisma.publisher.upsert({
    where: { name: 'Dargaud' },
    update: {},
    create: {
      name: 'Dargaud',
      website: 'https://www.dargaud.com',
      contactEmail: 'contact@dargaud.com',
    },
  });

  console.log('✓ Éditeurs et collections créés');

  // 6. Auteurs
  const camus = await prisma.author.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      firstName: 'Albert',
      lastName: 'Camus',
      nationality: 'Française',
      bio: 'Écrivain, philosophe, romancier, dramaturge, essayiste et nouvelliste français. Prix Nobel de littérature en 1957.',
    },
  });

  const goscinny = await prisma.author.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      firstName: 'René',
      lastName: 'Goscinny',
      nationality: 'Française',
      bio: 'Scénariste de bande dessinée, journaliste, écrivain et humoriste français.',
    },
  });

  console.log('✓ Auteurs créés');

  // 7. Fournisseurs / Distributeurs
  const supplierHachette = await prisma.supplier.upsert({
    where: { name: 'Hachette Livre Distribution' },
    update: {},
    create: {
      name: 'Hachette Livre Distribution',
      distributorCode: 'HACHETTE-01',
      contactName: 'Service Commercial Libraires',
      email: 'commandes@hachette-distrib.fr',
      phone: '0145678900',
    },
  });

  const supplierMDS = await prisma.supplier.upsert({
    where: { name: 'MDS Distribution (Dargaud)' },
    update: {},
    create: {
      name: 'MDS Distribution (Dargaud)',
      distributorCode: 'MDS-02',
      contactName: 'Relations Libraires',
      email: 'contact@mds.fr',
    },
  });

  console.log('✓ Fournisseurs / Distributeurs créés');

  // 8. Livres
  const folioCollection = gallimard.collections.find((c) => c.name === 'Folio');

  const book1 = await prisma.book.upsert({
    where: { isbn13: '9782070360024' },
    update: {},
    create: {
      isbn13: '9782070360024',
      isbn10: '2070360024',
      title: "L'Étranger",
      summary:
        "« Aujourd'hui, maman est morte. Ou peut-être hier, je ne sais pas. » Chef-d'œuvre de la littérature du XXe siècle.",
      editionYear: 1942,
      pages: 186,
      language: 'Français',
      format: BookFormat.POCKET,
      priceTTC: 7.9,
      vatRate: 5.5,
      costPriceHT: 4.8,
      stockQuantity: 15,
      minStockAlert: 5,
      publisherId: gallimard.id,
      collectionId: folioCollection?.id,
      locationId: shelfLit.id,
      authors: {
        create: [{ authorId: camus.id, role: AuthorRole.AUTHOR }],
      },
      categories: {
        create: [{ categoryId: catLitterature.id, isPrimary: true }],
      },
      stockMovements: {
        create: {
          type: StockMovementType.RESTOCK,
          quantity: 15,
          previousStock: 0,
          newStock: 15,
          reference: 'INITIAL_STOCK',
          userId: bookseller.id,
        },
      },
    },
  });

  const book2 = await prisma.book.upsert({
    where: { isbn13: '9782012101333' },
    update: {},
    create: {
      isbn13: '9782012101333',
      title: 'Astérix le Gaulois',
      summary: 'Les aventures d’Astérix le Gaulois dans le village des irréductibles qui résiste encore et toujours à l’envahisseur.',
      editionYear: 1961,
      pages: 48,
      language: 'Français',
      format: BookFormat.COMICS_MANGA,
      priceTTC: 10.95,
      vatRate: 5.5,
      costPriceHT: 6.5,
      stockQuantity: 8,
      minStockAlert: 3,
      publisherId: dargaud.id,
      locationId: shelfBD.id,
      authors: {
        create: [{ authorId: goscinny.id, role: AuthorRole.AUTHOR }],
      },
      categories: {
        create: [{ categoryId: catBD.id, isPrimary: true }],
      },
      stockMovements: {
        create: {
          type: StockMovementType.RESTOCK,
          quantity: 8,
          previousStock: 0,
          newStock: 8,
          reference: 'INITIAL_STOCK',
          userId: bookseller.id,
        },
      },
    },
  });

  console.log(`✓ Livres créés ("${book1.title}", "${book2.title}")`);
  console.log('✅ Base de données initialisée avec succès !');
}

main()
  .catch((e) => {
    console.error('Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
