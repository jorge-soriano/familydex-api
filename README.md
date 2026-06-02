# FamilyDex API

Backend REST de FamilyDex — app de gamificación familiar con temática Pokémon.  
Los hijos ganan XP y monedas completando tareas, capturan y evolucionan Pokémon, y canjean recompensas reales.

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js + Express |
| Lenguaje | TypeScript |
| ORM | Sequelize 6 |
| Base de datos | PostgreSQL 16 |
| Autenticación | JWT (jsonwebtoken) + bcrypt |
| Testing | Jest + Supertest |
| Migraciones | Sequelize CLI |
| Dev server | Nodemon + ts-node |

## Inicio rápido

```bash
# 1. Variables de entorno
cp .env.example .env

# 2. Base de datos
docker-compose up -d
npm run db:migrate

# 3. Arrancar
npm run dev   # http://localhost:3001
```

> La primera vez que arranca, el servidor ejecuta `seedPokemon()` automáticamente
> e inserta el catálogo de 22 Pokémon en la base de datos.

## Comandos

```bash
npm run dev              # Desarrollo con hot-reload (nodemon)
npm run build            # Compilar TypeScript → dist/
npm start                # Producción (requiere build previo)
npm run typecheck        # Verificar tipos sin compilar

npm run db:migrate       # Aplicar migraciones en familydex_dev
npm run db:migrate:test  # Aplicar migraciones en familydex_test
npm run db:migrate:undo  # Deshacer todas las migraciones
npm run db:seed          # Ejecutar seeders (Sequelize CLI)

npm run test:unit        # Tests unitarios (sin base de datos)
npm run test:integration # Tests de integración (requiere Docker)
npm test                 # Todos los tests
```

## Estructura del proyecto

```
familydex-api/
├── src/
│   ├── config/
│   │   ├── database.ts          # Conexión Sequelize + PostgreSQL
│   │   ├── jwt.ts               # Configuración JWT
│   │   └── sequelize.config.js  # Config para Sequelize CLI
│   ├── models/                  # Modelos Sequelize + asociaciones
│   │   ├── index.ts
│   │   ├── user.model.ts
│   │   ├── childProfile.model.ts
│   │   ├── task.model.ts
│   │   ├── taskSeries.model.ts
│   │   ├── transaction.model.ts
│   │   ├── reward.model.ts
│   │   ├── rewardRequest.model.ts
│   │   ├── pokemon.model.ts
│   │   └── caughtPokemon.model.ts
│   ├── services/                # Lógica de negocio (lo que se testea)
│   │   ├── auth.service.ts
│   │   ├── task.service.ts
│   │   ├── economy.service.ts
│   │   ├── pokemon.service.ts
│   │   ├── reward.service.ts
│   │   └── admin.service.ts
│   ├── controllers/             # Validación de entrada + delegación al servicio
│   ├── routes/                  # Endpoints + middlewares
│   │   └── index.ts             # Agrega todo bajo /api
│   ├── middlewares/
│   │   ├── auth.middleware.ts         # Verifica JWT
│   │   ├── familyIsolation.middleware.ts  # Verifica familyId + roles
│   │   └── errorHandler.middleware.ts
│   ├── migrations/              # Sequelize CLI migrations (10 archivos)
│   ├── seeders/
│   │   └── pokemon.seeder.ts    # Catálogo de 22 Pokémon
│   ├── jobs/
│   │   └── recurringTasks.job.ts  # node-cron — genera tareas a medianoche
│   ├── app.ts
│   └── server.ts
├── tests/
│   ├── unit/                    # Tests de servicios con mocks
│   ├── integration/             # Tests de endpoints con Supertest
│   └── helpers/
│       └── db.ts                # umzug + clearAll para tests
├── scripts/
│   └── init-db.sh               # Crea familydex_test en primer arranque Docker
├── docker-compose.yml
├── .env.example
├── .sequelizerc
├── jest.config.js
├── nodemon.json
└── tsconfig.json
```

## API — endpoints

```
POST   /api/auth/register                  Registro de administrador
POST   /api/auth/login                     Login (email para admin, username para hijo)
POST   /api/auth/logout
POST   /api/auth/children                  Crear cuenta de hijo (Admin)
GET    /api/auth/children                  Listar hijos de la familia (Admin)

GET    /api/tasks                          Listar tareas (Admin: familia; Hijo: propias)
POST   /api/tasks                          Crear tarea (Admin)
PUT    /api/tasks/:id                      Editar tarea (Admin)
DELETE /api/tasks/:id                      Eliminar tarea (Admin)
POST   /api/tasks/:id/complete             Marcar como completada (Hijo)
POST   /api/tasks/:id/approve              Aprobar tarea (Admin)
POST   /api/tasks/:id/reject               Rechazar tarea (Admin)

GET    /api/economy/balance                Saldo y XP
GET    /api/economy/transactions           Historial de transacciones
POST   /api/economy/penalty               Aplicar penalización (Admin)

GET    /api/pokemon/starters               Pokémon para onboarding
POST   /api/pokemon/choose-initial         Elegir Pokémon inicial (Hijo)
GET    /api/pokemon                        Colección + activo
GET    /api/pokemon/available              Disponibles para capturar (Hijo)
POST   /api/pokemon/capture                Capturar Pokémon (Hijo)
PUT    /api/pokemon/active                 Cambiar Pokémon activo (Hijo)

GET    /api/rewards                        Listar recompensas
POST   /api/rewards                        Crear recompensa (Admin)
PUT    /api/rewards/:id                    Editar recompensa (Admin)
PATCH  /api/rewards/:id/status             Activar/desactivar (Admin)
GET    /api/rewards/requests               Listar solicitudes
POST   /api/rewards/requests               Solicitar recompensa (Hijo)
POST   /api/rewards/requests/:id/approve   Aprobar solicitud (Admin)
POST   /api/rewards/requests/:id/reject    Rechazar solicitud (Admin)

GET    /api/admin/dashboard                Dashboard con resumen de hijos
GET    /api/admin/notifications            Contadores de acciones pendientes
GET    /api/admin/children                 Gestión de hijos
GET    /api/admin/children/:id             Detalle de un hijo
PUT    /api/admin/children/:id             Editar hijo
PATCH  /api/admin/children/:id/status      Activar/desactivar cuenta hijo
```

## Reglas de negocio clave

- **Monedas**: nunca negativas (penalización lleva a 0 como mínimo)
- **XP**: nunca baja; las penalizaciones no la afectan
- **Pokémon nivel**: `floor(cbrt(pokemonXp))`, calculado en runtime
- **Evolución**: automática al alcanzar `evolvesAtLevel`; hereda `pokemonXp`
- **Capturas**: `1 + floor(xp / 5000)` slots totales (el +1 es el starter gratuito)
- **Reserva de monedas**: al solicitar recompensa se reservan (no deducen); se deducen al aprobar

## Variables de entorno

Ver `.env.example` para la referencia completa.  
Valores por defecto para desarrollo local con Docker:

```env
PORT=3001
DB_HOST=localhost
DB_PORT=5434
DB_NAME=familydex_dev
DB_USER=familydex
DB_PASSWORD=familydex
DB_NAME_TEST=familydex_test
JWT_SECRET=change-me-in-production
```

## Tests

**58 tests unitarios** (5 suites) — no requieren base de datos:
- `auth.service.test.ts` — registro, creación de hijos, login
- `task.service.test.ts` — flujo completo de tareas
- `economy.service.test.ts` — saldo, penalizaciones, historial
- `pokemon.service.test.ts` — onboarding, XP, evolución, captura
- `reward.service.test.ts` — reserva de monedas, aprobar, rechazar

**Tests de integración** — requieren PostgreSQL en Docker:
- `auth.test.ts`, `tasks.test.ts`, `economy.test.ts`
- `pokemon.test.ts`, `rewards.test.ts`, `admin.test.ts`
