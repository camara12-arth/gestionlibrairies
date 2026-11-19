jest.mock('../src/services/paiement', () => ({
  effectuerPaiement: jest.fn(async () => ({ statut: 'simule', reference: 'SIM-TEST' }))
}));

function creerClientMock() {
  const reponses = [];
  const client = { query: jest.fn(async (sql) => {
    if (sql.includes('FROM livres l JOIN stock s') && sql.includes('FOR UPDATE')) {
      const resultat = reponses.shift();
      if (!resultat) return { rows: [{ id: 1, prix: 5000, quantite: 5, quantite_reservee: 0 }] };
      return { rows: resultat };
    }
    if (sql.includes('INSERT INTO commandes')) {
      return { rows: [{ id: 99, reference: 'CMD-TEST-001', statut: 'nouvelle', sous_total: 5000, frais_livraison: 1000, total: 6000 }] };
    }
    if (sql.includes('SELECT quantite, quantite_reservee FROM stock')) {
      return { rows: [{ quantite: 5, quantite_reservee: 0 }] };
    }
    if (sql.includes('SELECT quantite FROM stock')) {
      return { rows: [{ quantite: 5 }] };
    }
    if (sql.includes('SELECT * FROM commandes WHERE id=$1')) {
      return { rows: [{ id: 99, reference: 'CMD-TEST-001', statut: 'payee' }] };
    }
    if (sql.includes('SELECT livre_id, quantite FROM lignes_commande')) {
      return { rows: [{ livre_id: 1, quantite: 2 }] };
    }
    if (sql.includes('FROM parametres')) return { rows: [] };
    return { rows: [] };
  }), release: jest.fn() };
  return client;
}

jest.mock('../src/config/database', () => ({
  connect: jest.fn()
}));

const pool = require('../src/config/database');
const commandeService = require('../src/services/commandeService');

describe('Commandes et stock', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejette une commande si le stock est insuffisant', async () => {
    const client = creerClientMock();
    client.query.mockImplementation(async (sql) => {
      if (sql.includes('FROM livres l JOIN stock s') && sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 1, prix: 5000, quantite: 1, quantite_reservee: 0 }] };
      }
      return { rows: [] };
    });
    pool.connect.mockResolvedValue(client);

    await expect(commandeService.creerCommande({
      panier: [{ livreId: 1, quantite: 2 }],
      infos: { prenom: 'Amina', nom: 'Diarra', telephone: '+22370000003', modeLivraison: 'retrait', paiement: 'retrait' },
      utilisateurId: 10
    })).rejects.toThrow('Stock insuffisant');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('valide une commande et décrémente le stock', async () => {
    const client = creerClientMock();
    pool.connect.mockResolvedValue(client);

    const commande = await commandeService.creerCommande({
      panier: [{ livreId: 1, quantite: 2 }],
      infos: { prenom: 'Amina', nom: 'Diarra', telephone: '+22370000003', modeLivraison: 'retrait', paiement: 'orange' },
      utilisateurId: 10
    });

    expect(commande.reference).toBe('CMD-TEST-001');
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE stock SET quantite=$1'), [3, 1]);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  test("annule une commande et remet les quantités en stock", async () => {
    const client = creerClientMock();
    pool.connect.mockResolvedValue(client);

    await commandeService.annulerCommande(99, 10);

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('quantite=quantite+$1'),
      [2, 1]
    );
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });
});
