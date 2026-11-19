// Module simulé : remplacez effectuerPaiement par l’appel Orange/Moov réel.
async function effectuerPaiement({ operateur, _telephone, montant, reference }) {
  if (!['orange', 'moov', 'livraison', 'retrait'].includes(operateur)) {
    throw new Error('Mode de paiement invalide');
  }
  if (!Number.isInteger(montant) || montant < 0) throw new Error('Montant invalide');

  if (operateur === 'livraison' || operateur === 'retrait') {
    return { statut: 'en_attente', reference: `MANUEL-${reference}` };
  }
  return { statut: 'simule', reference: `SIM-${operateur.toUpperCase()}-${reference}-${Date.now()}` };
}

module.exports = { effectuerPaiement };
