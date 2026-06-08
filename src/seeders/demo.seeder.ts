import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Op } from 'sequelize';
import { User } from '../models/user.model';
import { ChildProfile } from '../models/childProfile.model';
import { TaskSeries } from '../models/taskSeries.model';
import { Task } from '../models/task.model';
import { Transaction } from '../models/transaction.model';
import { Reward } from '../models/reward.model';
import { RewardRequest } from '../models/rewardRequest.model';
import { Pokemon } from '../models/pokemon.model';
import { CaughtPokemon } from '../models/caughtPokemon.model';
import type { TaskType, TaskFrequency } from '../models/taskSeries.model';
import type { TaskStatus } from '../models/task.model';

const DEMO_EMAIL  = 'padre@demo.com';
const SALT_ROUNDS = 10;

/** Creates a daily TaskSeries + today's instance */
async function dailyTask(
  familyId: string,
  assignedTo: number,
  title: string,
  type: TaskType,
  coinsReward: number,
  xpReward: number,
  status: TaskStatus
) {
  const series = await TaskSeries.create({
    familyId, assignedTo, title, type,
    coinsReward, xpReward,
    frequency: 'Daily' as TaskFrequency,
    daysOfWeek: null,
    isActive: true,
  });
  await Task.create({ familyId, assignedTo, seriesId: series.id, title, type, coinsReward, xpReward, status });
}

export async function seedDemo(): Promise<void> {
  // Teardown: borrar todos los datos de la familia demo en orden de FK
  const existing = await User.findOne({ where: { email: DEMO_EMAIL } });
  if (existing) {
    const familyUsers = await User.findAll({ where: { familyId: existing.familyId }, attributes: ['id'] });
    const childIds = familyUsers.map((u) => u.id);
    await RewardRequest.destroy({ where: { childId: { [Op.in]: childIds } } });
    await CaughtPokemon.destroy({ where: { childId: { [Op.in]: childIds } } });
    await Transaction.destroy({ where: { childId: { [Op.in]: childIds } } });
    await Task.destroy({ where: { familyId: existing.familyId } });
    await TaskSeries.destroy({ where: { familyId: existing.familyId } });
    await Reward.destroy({ where: { familyId: existing.familyId } });
    await ChildProfile.destroy({ where: { userId: { [Op.in]: childIds } } });
    await User.destroy({ where: { familyId: existing.familyId } });
    console.log('✓ Demo anterior eliminado');
  }

  const familyId = randomUUID();

  // ── Admin ─────────────────────────────────────────────────────────────────
  await User.create({
    familyId, username: 'padregarcia', email: DEMO_EMAIL,
    passwordHash: await bcrypt.hash('Demo1234', SALT_ROUNDS),
    role: 'admin',
  });

  // ── Lucas (8 años) ────────────────────────────────────────────────────────
  const lucas = await User.create({
    familyId, username: 'lucas', email: null,
    passwordHash: await bcrypt.hash('lucas123', SALT_ROUNDS),
    role: 'child',
  });
  await ChildProfile.create({
    userId: lucas.id, displayName: 'Lucas', avatarColor: '#3b82f6',
    coins: 45, xp: 11000,
  });

  // ── Sofía (5 años) ────────────────────────────────────────────────────────
  const sofia = await User.create({
    familyId, username: 'sofia', email: null,
    passwordHash: await bcrypt.hash('sofia123', SALT_ROUNDS),
    role: 'child',
  });
  await ChildProfile.create({
    userId: sofia.id, displayName: 'Sofía', avatarColor: '#ec4899',
    coins: 30, xp: 3200,
  });

  // ── Pokémon ───────────────────────────────────────────────────────────────
  // Charmander activo con 11 000 pokemonXp → nivel 22 (≥ evolvesAtLevel 16)
  // = readyToEvolve:true para demo de evolución manual. pokemonXp = xp del perfil.
  const charmander = await Pokemon.findOne({ where: { pokedexNumber: 4 } });
  if (charmander) {
    await CaughtPokemon.create({ childId: lucas.id, pokemonId: charmander.id, isActive: true, pokemonXp: 11000, caughtAt: new Date() });
  }
  const pikachu = await Pokemon.findOne({ where: { pokedexNumber: 25 } });
  if (pikachu) {
    await CaughtPokemon.create({ childId: sofia.id, pokemonId: pikachu.id, isActive: true, pokemonXp: 3375, caughtAt: new Date() });
  }

  // ── Recompensas ───────────────────────────────────────────────────────────
  const rewardPantalla = await Reward.create({
    familyId, name: '30 min de pantalla',
    description: 'Media hora extra de móvil, tablet o videojuegos.',
    coinCost: 20, isActive: true,
  });
  await Reward.create({ familyId, name: 'Noche de película',    description: 'Elegir la peli del viernes y quedarse a verla.',     coinCost: 60, isActive: true });
  await Reward.create({ familyId, name: 'Salida al parque',     description: 'Una tarde de juegos en el parque.',                   coinCost: 40, isActive: true });
  await Reward.create({ familyId, name: 'Videojuego 1h extra',  description: 'Una hora adicional de videojuegos el fin de semana.', coinCost: 50, isActive: true });

  // ── Tareas diarias de Lucas ───────────────────────────────────────────────
  // status refleja el estado del día de hoy
  await dailyTask(familyId, lucas.id, 'Levantarte a la primera',      'hogar',           5,  25,  'Pending');
  await dailyTask(familyId, lucas.id, 'Vestirte solo',                 'responsabilidad', 5,  25,  'Pending');
  await dailyTask(familyId, lucas.id, 'Hacer los deberes',             'deberes',         15, 100, 'InReview');
  await dailyTask(familyId, lucas.id, 'Estudiar',                      'deberes',         15, 100, 'Pending');
  await dailyTask(familyId, lucas.id, 'Cepillarte los dientes',        'responsabilidad', 5,  30,  'Pending');
  await dailyTask(familyId, lucas.id, 'Prepararte la mochila',         'responsabilidad', 10, 50,  'Pending');
  await dailyTask(familyId, lucas.id, 'Desayunar sin distraerse',      'comportamiento',  5,  25,  'InReview');
  await dailyTask(familyId, lucas.id, 'Ducha sin protestar',           'responsabilidad', 10, 50,  'Pending');
  await dailyTask(familyId, lucas.id, 'Leer 15 minutos',               'deberes',         10, 75,  'Pending');
  await dailyTask(familyId, lucas.id, 'Un día completo sin pantallas', 'comportamiento',  20, 150, 'Pending');

  // ── Tareas diarias de Sofía ───────────────────────────────────────────────
  await dailyTask(familyId, sofia.id, 'Levantarte a la primera',       'hogar',           5,  25,  'Pending');
  await dailyTask(familyId, sofia.id, 'Vestirte sola',                 'responsabilidad', 5,  25,  'Pending');
  await dailyTask(familyId, sofia.id, 'Ayudar a poner y quitar la mesa','hogar',          5,  30,  'InReview');
  await dailyTask(familyId, sofia.id, 'Acabarte toda la comida',       'comportamiento',  5,  25,  'Pending');
  await dailyTask(familyId, sofia.id, 'Cepillarte los dientes',        'responsabilidad', 5,  30,  'Pending');
  await dailyTask(familyId, sofia.id, 'Recoger los juguetes',          'hogar',           5,  30,  'Pending');
  await dailyTask(familyId, sofia.id, 'Ducha sin protestar',           'responsabilidad', 10, 50,  'Pending');

  // ── Historial de Lucas (suma: +45🪙, +11 000⭐) ───────────────────────────
  await Transaction.create({ childId: lucas.id, type: 'TaskReward',   coinsDelta:  20, xpDelta: 2500, description: 'Tarea aprobada: Levantarte a la primera' });
  await Transaction.create({ childId: lucas.id, type: 'TaskReward',   coinsDelta:  25, xpDelta: 3600, description: 'Tarea aprobada: Hacer los deberes' });
  await Transaction.create({ childId: lucas.id, type: 'DirectRecord', coinsDelta: -35, xpDelta:    0, description: 'Mal comportamiento en el parque' });
  await Transaction.create({ childId: lucas.id, type: 'TaskReward',   coinsDelta:  20, xpDelta: 2000, description: 'Tarea aprobada: Estudiar' });
  await Transaction.create({ childId: lucas.id, type: 'TaskReward',   coinsDelta:  15, xpDelta: 2500, description: 'Tarea aprobada: Leer 15 minutos' });
  await Transaction.create({ childId: lucas.id, type: 'DirectRecord', coinsDelta:  40, xpDelta:  400, description: 'Examen con notable' });
  await Transaction.create({ childId: lucas.id, type: 'DirectRecord', coinsDelta: -40, xpDelta:    0, description: 'No has hecho los deberes' });
  // coins: 20+25-35+20+15+40-40 = 45 ✓   xp: 2500+3600+2000+2500+400 = 11000 ✓

  // ── Historial de Sofía (suma: +30🪙, +3 200⭐) ────────────────────────────
  await Transaction.create({ childId: sofia.id, type: 'TaskReward',   coinsDelta:  20, xpDelta: 1600, description: 'Tarea aprobada: Ayudar a poner y quitar la mesa' });
  await Transaction.create({ childId: sofia.id, type: 'DirectRecord', coinsDelta: -10, xpDelta:    0, description: 'Berrinche en el supermercado' });
  await Transaction.create({ childId: sofia.id, type: 'TaskReward',   coinsDelta:  15, xpDelta: 1500, description: 'Tarea aprobada: Recoger los juguetes' });
  await Transaction.create({ childId: sofia.id, type: 'DirectRecord', coinsDelta:  10, xpDelta:  100, description: 'Buen comportamiento en la comida familiar' });
  await Transaction.create({ childId: sofia.id, type: 'DirectRecord', coinsDelta:  -5, xpDelta:    0, description: 'Mala actitud antes de dormir' });
  // coins: 20-10+15+10-5 = 30 ✓   xp: 1600+1500+100 = 3200 ✓

  // ── Solicitud de recompensa pendiente (Lucas) ─────────────────────────────
  await RewardRequest.create({
    childId: lucas.id, rewardId: rewardPantalla.id,
    status: 'Pending', coinsReserved: 20,
  });

  console.log('✓ Demo data seeded — Familia García (padre@demo.com / Demo1234)');
}

if (require.main === module) {
  seedDemo().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
