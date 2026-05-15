// scripts/migrateToPool.js
require('dotenv').config();
const mongoose            = require('mongoose');
const PlayHistory         = require('../models/PlayHistory');
const TrackRecommendation = require('../models/TrackRecommendation');

async function migrate() {
  await mongoose.connect('mongodb+srv://ProyUniversidad:gM32XJ1ttb4Wr4jh@bdproyectosuniversidad.srkfuuy.mongodb.net/ShafaFy-ED2?retryWrites=true&w=majority');
  console.log('✅ Conectado a MongoDB');

  // Limpiar el pool primero para evitar duplicados sucios
  await TrackRecommendation.deleteMany({});
  console.log('🗑️  Pool limpiado');

  const all = await PlayHistory.find({})
    .select('trackId trackName artistId artistName albumName albumImage genre playCount userId')
    .lean();
  console.log(`📦 ${all.length} registros en PlayHistory`);

  let ok = 0;
  for (const h of all) {
    // Log para debug
    if (ok < 3) console.log('Sample:', h.trackId, '|', h.artistId, '|', h.artistName);

    const doc = await TrackRecommendation.findOneAndUpdate(
      { trackId: h.trackId },
      {
        $inc: { playCount: h.playCount || 1 },
        $set: {
          trackName:  h.trackName,
          artistId:   h.artistId   || h.artistName, // fallback al nombre si no hay ID
          artistName: h.artistName,
          albumName:  h.albumName  || '',
          albumImage: h.albumImage || '',
          genre:      h.genre      || 'unknown',
          updatedAt:  new Date(),
        },
        $addToSet: { users: h.userId },
        $setOnInsert: { firstHeardAt: new Date() },
      },
      { upsert: true, new: true }
    );
    await TrackRecommendation.updateOne(
      { trackId: h.trackId },
      { $set: { userCount: doc.users.length } }
    );
    ok++;
  }

  console.log(`✅ Migradas ${ok} canciones al pool`);
  await mongoose.disconnect();
}

migrate().catch(console.error);