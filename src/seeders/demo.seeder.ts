import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { User } from '../models/user.model';
import { ChildProfile } from '../models/childProfile.model';
import { Task } from '../models/task.model';
import { Transaction } from '../models/transaction.model';
import { Reward } from '../models/reward.model';
import { RewardRequest } from '../models/rewardRequest.model';
import { Pokemon } from '../models/pokemon.model';
import { CaughtPokemon } from '../models/caughtPokemon.model';
import { TaskTemplate } from '../models/taskTemplate.model';

const DEMO_EMAIL   = 'padre@demo.com';
const SALT_ROUNDS  = 10;

export async function seedDemo(): Promise<void> {
  // Idempotente — no re-siembra si ya existe la familia demo
  const exists = await User.findOne({ where: { email: DEMO_EMAIL } });
  if (exists) return;

  const familyId = randomUUID();

  // ── Admin ─────────────────────────────────────────────────────────────────
  await User.create({
    familyId,
    username: 'padregarcia',
    email: DEMO_EMAIL,
    passwordHash: await bcrypt.hash('Demo1234', SALT_ROUNDS),
    role: 'admin',
  });

  // ── Hijos ─────────────────────────────────────────────────────────────────
  const lucas = await User.create({
    familyId,
    username: 'lucas',
    email: null,
    passwordHash: await bcrypt.hash('lucas123', SALT_ROUNDS),
    role: 'child',
  });
  await ChildProfile.create({
    userId: lucas.id,
    displayName: 'Lucas',
    avatarColor: '#3b82f6',
    coins: 45,
    xp: 11000,
  });

  const sofia = await User.create({
    familyId,
    username: 'sofia',
    email: null,
    passwordHash: await bcrypt.hash('sofia123', SALT_ROUNDS),
    role: 'child',
  });
  await ChildProfile.create({
    userId: sofia.id,
    displayName: 'Sofía',
    avatarColor: '#ec4899',
    coins: 30,
    xp: 3200,
  });

  // ── Pokémon ───────────────────────────────────────────────────────────────
  // Lucas: Charmander → evolucionó a Charmeleon (nivel 18, pokemonXp 5832)
  const charmander = await Pokemon.findOne({ where: { pokedexNumber: 4 } });
  const charmeleon = await Pokemon.findOne({ where: { pokedexNumber: 5 } });
  if (charmander && charmeleon) {
    await CaughtPokemon.create({
      childId: lucas.id, pokemonId: charmander.id,
      isActive: false, pokemonXp: 5832, caughtAt: new Date(),
    });
    await CaughtPokemon.create({
      childId: lucas.id, pokemonId: charmeleon.id,
      isActive: true, pokemonXp: 5832, caughtAt: new Date(),
    });
  }

  // Sofía: Pikachu activo (nivel 15, pokemonXp 3375)
  const pikachu = await Pokemon.findOne({ where: { pokedexNumber: 25 } });
  if (pikachu) {
    await CaughtPokemon.create({
      childId: sofia.id, pokemonId: pikachu.id,
      isActive: true, pokemonXp: 3375, caughtAt: new Date(),
    });
  }

  // ── Recompensas ───────────────────────────────────────────────────────────
  const rewardPantalla = await Reward.create({
    familyId, name: '30 min de pantalla',
    description: 'Media hora extra de móvil, tablet o videojuegos.',
    coinCost: 20, isActive: true,
  });
  await Reward.create({
    familyId, name: 'Noche de película',
    description: 'Elegir la peli del viernes y quedarse a verla.',
    coinCost: 60, isActive: true,
  });
  await Reward.create({
    familyId, name: 'Salida al parque',
    description: 'Una tarde de juegos en el parque.',
    coinCost: 40, isActive: true,
  });
  await Reward.create({
    familyId, name: 'Videojuego 1h extra',
    description: 'Una hora adicional de videojuegos el fin de semana.',
    coinCost: 50, isActive: true,
  });

  // ── Tareas de Lucas ───────────────────────────────────────────────────────
  const lt1 = await Task.create({ familyId, assignedTo: lucas.id, title: 'Hacer los deberes',    type: 'deberes',         coinsReward: 20, xpReward: 2500, status: 'Approved' });
  const lt2 = await Task.create({ familyId, assignedTo: lucas.id, title: 'Recoger la habitación',type: 'hogar',           coinsReward: 25, xpReward: 3000, status: 'Approved' });
  const lt3 = await Task.create({ familyId, assignedTo: lucas.id, title: 'Ducha sin quejarse',   type: 'responsabilidad', coinsReward: 20, xpReward: 3000, status: 'Approved' });
  const lt4 = await Task.create({ familyId, assignedTo: lucas.id, title: 'Tender la cama',       type: 'hogar',           coinsReward: 15, xpReward: 2500, status: 'Approved' });
  await       Task.create({ familyId, assignedTo: lucas.id, title: 'Poner la mesa',         type: 'hogar',           coinsReward: 10, xpReward:  500, status: 'InReview' });
  await       Task.create({ familyId, assignedTo: lucas.id, title: 'Estudiar inglés',       type: 'deberes',         coinsReward: 15, xpReward: 1000, status: 'Rejected',
                             rejectionReason: 'La próxima hazlo sin distracciones.' });
  await       Task.create({ familyId, assignedTo: lucas.id, title: 'Ordenar los juguetes',  type: 'hogar',           coinsReward:  5, xpReward:  100, status: 'Pending' });

  // ── Tareas de Sofía ───────────────────────────────────────────────────────
  const st1 = await Task.create({ familyId, assignedTo: sofia.id, title: 'Recoger los juguetes',    type: 'hogar',           coinsReward: 20, xpReward: 1500, status: 'Approved' });
  const st2 = await Task.create({ familyId, assignedTo: sofia.id, title: 'Cepillarse los dientes',  type: 'responsabilidad', coinsReward: 15, xpReward: 1700, status: 'Approved' });
  await       Task.create({ familyId, assignedTo: sofia.id, title: 'Ayudar a poner la mesa', type: 'hogar',           coinsReward: 10, xpReward:  500, status: 'InReview' });
  await       Task.create({ familyId, assignedTo: sofia.id, title: 'Dormir sin lloriquear',  type: 'comportamiento',  coinsReward: 15, xpReward:  800, status: 'Pending' });

  // ── Transacciones de Lucas (suma: +45 monedas, +11000 XP) ─────────────────
  await Transaction.create({ childId: lucas.id, taskId: lt1.id, type: 'TaskReward', coinsDelta:  20, xpDelta: 2500, description: 'Tarea aprobada: Hacer los deberes' });
  await Transaction.create({ childId: lucas.id, taskId: lt2.id, type: 'TaskReward', coinsDelta:  25, xpDelta: 3000, description: 'Tarea aprobada: Recoger la habitación' });
  await Transaction.create({ childId: lucas.id,                  type: 'Penalty',   coinsDelta: -35, xpDelta:    0, description: 'Mal comportamiento en la cena' });
  await Transaction.create({ childId: lucas.id, taskId: lt3.id, type: 'TaskReward', coinsDelta:  20, xpDelta: 3000, description: 'Tarea aprobada: Ducha sin quejarse' });
  await Transaction.create({ childId: lucas.id, taskId: lt4.id, type: 'TaskReward', coinsDelta:  15, xpDelta: 2500, description: 'Tarea aprobada: Tender la cama' });

  // ── Transacciones de Sofía (suma: +30 monedas, +3200 XP) ─────────────────
  await Transaction.create({ childId: sofia.id, taskId: st1.id, type: 'TaskReward', coinsDelta:  20, xpDelta: 1500, description: 'Tarea aprobada: Recoger los juguetes' });
  await Transaction.create({ childId: sofia.id,                  type: 'Penalty',   coinsDelta:  -5, xpDelta:    0, description: 'Berrinche en el supermercado' });
  await Transaction.create({ childId: sofia.id, taskId: st2.id, type: 'TaskReward', coinsDelta:  15, xpDelta: 1700, description: 'Tarea aprobada: Cepillarse los dientes' });

  // ── Solicitud de recompensa pendiente (Lucas) ─────────────────────────────
  // 20 monedas reservadas → saldo efectivo = 45 - 20 = 25
  await RewardRequest.create({
    childId: lucas.id,
    rewardId: rewardPantalla.id,
    status: 'Pending',
    coinsReserved: 20,
  });

  // ── Plantillas de misiones ────────────────────────────────────────────────
  const templates = [
    // Rutinas del hogar
    { title: 'Hacer la cama',         type: 'hogar',          coinsReward:  5, xpReward:  30, category: 'Hogar' },
    { title: 'Ordenar la habitación', type: 'hogar',          coinsReward: 10, xpReward:  50, category: 'Hogar' },
    { title: 'Ayudar a poner la mesa',type: 'hogar',          coinsReward:  5, xpReward:  25, category: 'Hogar' },
    // Estudio
    { title: 'Leer 15 minutos',       type: 'deberes',        coinsReward: 10, xpReward:  75, category: 'Estudio' },
    { title: 'Preparar la mochila',   type: 'responsabilidad',coinsReward:  5, xpReward:  30, category: 'Estudio' },
    // Exámenes (variantes independientes — preparado para agrupar en el futuro via category)
    { title: 'Examen aprobado — suficiente', type: 'deberes', coinsReward: 20, xpReward: 150, category: 'Exámenes' },
    { title: 'Examen aprobado — bien',       type: 'deberes', coinsReward: 30, xpReward: 250, category: 'Exámenes' },
    { title: 'Examen aprobado — notable',    type: 'deberes', coinsReward: 40, xpReward: 400, category: 'Exámenes' },
    { title: 'Examen aprobado — excelente',  type: 'deberes', coinsReward: 60, xpReward: 600, category: 'Exámenes' },
    // Comportamiento
    { title: 'Ayudar en casa',         type: 'hogar',         coinsReward: 10, xpReward:  50, category: 'Comportamiento' },
    { title: 'Buen comportamiento',    type: 'comportamiento', coinsReward: 15, xpReward: 100, category: 'Comportamiento' },
  ];

  for (const t of templates) {
    await TaskTemplate.create({ familyId, ...t } as any);
  }

  console.log('✓ Demo data seeded — Familia García (padre@demo.com / Demo1234)');
}
