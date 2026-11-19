process.env.SESSION_SECRET = 'secret-de-test-local';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');

// Test léger de démarrage ; la base complète sera branchée aux étapes suivantes.
describe('Application de base', () => {
  test('affiche la page d’accueil', async () => {
    const reponse = await request(app).get('/');
    expect(reponse.status).toBe(200);
  });

  test('retourne une page 404', async () => {
    const reponse = await request(app).get('/page-inexistante');
    expect(reponse.status).toBe(404);
  });
});
