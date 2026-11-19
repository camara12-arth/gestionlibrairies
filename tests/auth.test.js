jest.mock('bcryptjs', () => ({
  hash: jest.fn(async () => '$2b$12$mot-de-passe-hache'),
  compare: jest.fn(async () => true)
}));

jest.mock('../src/models/utilisateur', () => ({
  emailExiste: jest.fn(async () => false),
  creerUtilisateur: jest.fn(async (donnees) => ({ id: 10, role: 'client', ...donnees })),
  trouverUtilisateurParEmail: jest.fn(async () => ({
    id: 10,
    email: 'client@example.ml',
    mot_de_passe_hash: '$2b$12$mot-de-passe-hache',
    prenom: 'Amina',
    nom: 'Diarra',
    role: 'client',
    actif: true
  })),
  mettreAJourMotDePasse: jest.fn(async () => undefined)
}));

jest.mock('../src/config/database', () => ({
  query: jest.fn(async () => ({ rows: [] }))
}));

const bcrypt = require('bcryptjs');
const utilisateurs = require('../src/models/utilisateur');
const auth = require('../src/controllers/authController');

describe('Authentification', () => {
  test("l'inscription hache le mot de passe et crée un client", async () => {
    const req = {
      body: { prenom: 'Amina', nom: 'Diarra', email: 'client@example.ml', telephone: '+22370000003', mot_de_passe: 'MotDePasseFort2026!' }
    };
    const res = { status: jest.fn().mockReturnThis(), render: jest.fn(), redirect: jest.fn() };
    const next = jest.fn();

    await auth.inscrire(req, res, next);

    expect(bcrypt.hash).toHaveBeenCalled();
    expect(utilisateurs.creerUtilisateur).toHaveBeenCalledWith(expect.objectContaining({
      email: 'client@example.ml',
      prenom: 'Amina',
      nom: 'Diarra'
    }));
  });

  test('la connexion valide le mot de passe', async () => {
    const req = {
      body: { email: 'client@example.ml', mot_de_passe: 'MotDePasseFort2026!' },
      session: { regenerate: jest.fn((callback) => callback()), save: jest.fn((callback) => callback()) }
    };
    const res = { status: jest.fn().mockReturnThis(), render: jest.fn(), redirect: jest.fn() };

    await auth.connecter(req, res, jest.fn());

    expect(bcrypt.compare).toHaveBeenCalled();
    expect(req.session.utilisateur).toEqual(expect.objectContaining({ role: 'client' }));
  });
});
