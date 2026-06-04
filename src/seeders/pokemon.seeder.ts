import 'dotenv/config';
import { Pokemon } from '../models/pokemon.model';

// Starters: unlockXp=0, evolutionOrder=1 — shown in onboarding
// Evolutions: unlockXp=0, evolutionOrder>1 — obtained only via evolution
// Capturable: unlockXp>0 — unlocked by accumulating XP
const POKEMON_DATA = [
  // ── Cadena 1: Bulbasaur ───────────────────────────────────────────────────
  { pokedexNumber:1,  name:'Bulbasaur',  type1:'Planta',  type2:'Veneno',   pokedexDescription:'Lleva una semilla en el lomo que absorbe luz solar.',  evolutionChainId:1, evolutionOrder:1, evolvesToPokedexNumber:2,  evolvesAtLevel:16, evolutionTrigger:null,            unlockXp:0  },
  { pokedexNumber:2,  name:'Ivysaur',    type1:'Planta',  type2:'Veneno',   pokedexDescription:'La flor de su lomo absorbe la luz del sol para crecer.', evolutionChainId:1, evolutionOrder:2, evolvesToPokedexNumber:3,  evolvesAtLevel:32, evolutionTrigger:null,            unlockXp:0  },
  { pokedexNumber:3,  name:'Venusaur',   type1:'Planta',  type2:'Veneno',   pokedexDescription:'La enorme flor de su espalda irradia un aroma calmante.',evolutionChainId:1, evolutionOrder:3, evolvesToPokedexNumber:null, evolvesAtLevel:null, evolutionTrigger:null,          unlockXp:0  },

  // ── Cadena 2: Charmander ──────────────────────────────────────────────────
  { pokedexNumber:4,  name:'Charmander', type1:'Fuego',   type2:null,       pokedexDescription:'La llama de su cola indica su estado de salud.',         evolutionChainId:2, evolutionOrder:1, evolvesToPokedexNumber:5,  evolvesAtLevel:16, evolutionTrigger:null,            unlockXp:0  },
  { pokedexNumber:5,  name:'Charmeleon', type1:'Fuego',   type2:null,       pokedexDescription:'En combate, su llama se vuelve azul al alcanzar altas temperaturas.',evolutionChainId:2, evolutionOrder:2, evolvesToPokedexNumber:6,  evolvesAtLevel:36, evolutionTrigger:null, unlockXp:0  },
  { pokedexNumber:6,  name:'Charizard',  type1:'Fuego',   type2:'Volador',  pokedexDescription:'Vuela por el cielo buscando rivales poderosos.',          evolutionChainId:2, evolutionOrder:3, evolvesToPokedexNumber:null, evolvesAtLevel:null, evolutionTrigger:null,          unlockXp:0  },

  // ── Cadena 3: Squirtle ────────────────────────────────────────────────────
  { pokedexNumber:7,  name:'Squirtle',   type1:'Agua',    type2:null,       pokedexDescription:'Su concha le protege de los ataques y le ayuda a nadar.',  evolutionChainId:3, evolutionOrder:1, evolvesToPokedexNumber:8,  evolvesAtLevel:16, evolutionTrigger:null,            unlockXp:0  },
  { pokedexNumber:8,  name:'Wartortle',  type1:'Agua',    type2:null,       pokedexDescription:'Su larga cola de color azul oscuro es señal de sabiduría.', evolutionChainId:3, evolutionOrder:2, evolvesToPokedexNumber:9,  evolvesAtLevel:36, evolutionTrigger:null,            unlockXp:0  },
  { pokedexNumber:9,  name:'Blastoise',  type1:'Agua',    type2:null,       pokedexDescription:'Los cañones de agua de su espalda disparan con precisión.', evolutionChainId:3, evolutionOrder:3, evolvesToPokedexNumber:null, evolvesAtLevel:null, evolutionTrigger:null,          unlockXp:0  },

  // ── Cadena 4: Pikachu ─────────────────────────────────────────────────────
  { pokedexNumber:25, name:'Pikachu',    type1:'Eléctrico',type2:null,      pokedexDescription:'Sus mejillas almacenan electricidad que suelta con sus truenos.',evolutionChainId:4, evolutionOrder:1, evolvesToPokedexNumber:26, evolvesAtLevel:30, evolutionTrigger:'¡Encontraste una Piedra Trueno!', unlockXp:0 },
  { pokedexNumber:26, name:'Raichu',     type1:'Eléctrico',type2:null,      pokedexDescription:'Cuando acumula demasiada electricidad, se vuelve agresivo.',  evolutionChainId:4, evolutionOrder:2, evolvesToPokedexNumber:null, evolvesAtLevel:null, evolutionTrigger:null,        unlockXp:0  },

  // ── Capturables a partir de 5 000 XP ─────────────────────────────────────
  { pokedexNumber:39, name:'Jigglypuff', type1:'Normal',  type2:'Hada',     pokedexDescription:'Su canción de cuna hace dormir hasta al más insomne.',       evolutionChainId:null,evolutionOrder:null,evolvesToPokedexNumber:null, evolvesAtLevel:null, evolutionTrigger:null,       unlockXp:5000 },
  { pokedexNumber:52, name:'Meowth',     type1:'Normal',  type2:null,       pokedexDescription:'Le encantan los objetos brillantes y los colecciona.',         evolutionChainId:5, evolutionOrder:1, evolvesToPokedexNumber:53, evolvesAtLevel:28, evolutionTrigger:null,            unlockXp:5000 },
  { pokedexNumber:53, name:'Persian',    type1:'Normal',  type2:null,       pokedexDescription:'Es elegante y cruel. Ataca con sus veloces garras.',           evolutionChainId:5, evolutionOrder:2, evolvesToPokedexNumber:null, evolvesAtLevel:null, evolutionTrigger:null,          unlockXp:0    },
  { pokedexNumber:54, name:'Psyduck',    type1:'Agua',    type2:null,       pokedexDescription:'Siempre tiene dolor de cabeza. Puede usar poderes psíquicos.', evolutionChainId:6, evolutionOrder:1, evolvesToPokedexNumber:55, evolvesAtLevel:33, evolutionTrigger:null,            unlockXp:5000 },
  { pokedexNumber:55, name:'Golduck',    type1:'Agua',    type2:null,       pokedexDescription:'Es el nadador más rápido de todos los Pokémon acuáticos.',     evolutionChainId:6, evolutionOrder:2, evolvesToPokedexNumber:null, evolvesAtLevel:null, evolutionTrigger:null,          unlockXp:0    },
  { pokedexNumber:133,name:'Eevee',      type1:'Normal',  type2:null,       pokedexDescription:'Tiene una estructura genética irregular. Puede evolucionar de muchas formas.',evolutionChainId:null,evolutionOrder:null,evolvesToPokedexNumber:null,evolvesAtLevel:null,evolutionTrigger:null, unlockXp:5000 },

  // ── Capturables a partir de 10 000 XP ────────────────────────────────────
  { pokedexNumber:131,name:'Lapras',     type1:'Agua',    type2:'Hielo',    pokedexDescription:'Le encanta transportar a personas en su lomo por el mar.',    evolutionChainId:null,evolutionOrder:null,evolvesToPokedexNumber:null, evolvesAtLevel:null, evolutionTrigger:null,       unlockXp:10000 },
  { pokedexNumber:143,name:'Snorlax',    type1:'Normal',  type2:null,       pokedexDescription:'Duerme 20 horas al día. Cuando despierta, busca comida.',      evolutionChainId:null,evolutionOrder:null,evolvesToPokedexNumber:null, evolvesAtLevel:null, evolutionTrigger:null,       unlockXp:10000 },

  // ── Capturables a partir de 15 000 XP ────────────────────────────────────
  { pokedexNumber:134,name:'Vaporeon',   type1:'Agua',    type2:null,       pokedexDescription:'Puede fundirse con el agua y hacerse casi invisible.',         evolutionChainId:null,evolutionOrder:null,evolvesToPokedexNumber:null, evolvesAtLevel:null, evolutionTrigger:null,       unlockXp:15000 },
  { pokedexNumber:149,name:'Dragonite',  type1:'Dragón',  type2:'Volador',  pokedexDescription:'Puede volar más rápido que el sonido alrededor del planeta.',   evolutionChainId:null,evolutionOrder:null,evolvesToPokedexNumber:null, evolvesAtLevel:null, evolutionTrigger:null,       unlockXp:15000 },

  // ── Pokémon legendario — 20 000 XP ────────────────────────────────────────
  { pokedexNumber:151,name:'Mew',        type1:'Psíquico',type2:null,       pokedexDescription:'Se cree que contiene el ADN genético de todos los Pokémon.',    evolutionChainId:null,evolutionOrder:null,evolvesToPokedexNumber:null, evolvesAtLevel:null, evolutionTrigger:null,       unlockXp:20000 },
];

export async function seedPokemon(): Promise<void> {
  const existing = await Pokemon.count();
  if (existing > 0) return;

  await Pokemon.bulkCreate(POKEMON_DATA as any[]);
  console.log(`Seeded ${POKEMON_DATA.length} Pokémon`);
}

if (require.main === module) {
  seedPokemon().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
