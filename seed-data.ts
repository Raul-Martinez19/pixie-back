import neo4j from 'neo4j-driver';
import { config } from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// Determinar planeta desde argumento o variable de entorno
const planeta = process.argv[2] || process.env.PLANETA || 'tierra';
const envFile = `.env.${planeta}`;

// Cargar variables de entorno
config({ path: envFile });

console.log(`🌍 Seeding data for planeta-${planeta}`);
console.log(' Configuración:', {
  uri: process.env.NEO4J_URI,
  username: process.env.NEO4J_USERNAME,
  password: process.env.NEO4J_PASSWORD ? '***' : 'undefined',
});

const driver = neo4j.driver(
  process.env.NEO4J_URI ||
    (planeta === 'marte' ? 'bolt://localhost:7688' : 'bolt://localhost:7687'),
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password',
  ),
);

const tierraUsers = [
  {
    id: '1',
    username: 'raul',
    full_handle: 'raul@planeta-tierra',
    email: 'raul@tierra.com',
    created_at: new Date().toISOString(),
    bio: 'Explorador de Tierra ',
    avatar_url: 'https://i.pravatar.cc/150?img=1',
    password: 'raul1234',
    server: 'planeta-tierra',
    is_remote: false,
  },
  {
    id: '2',
    username: 'alice',
    full_handle: 'alice@planeta-tierra',
    email: 'alice@tierra.com',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    bio: 'Ingeniera y científica 🔬',
    avatar_url: 'https://i.pravatar.cc/150?img=2',
    password: 'alice1234',
    server: 'planeta-tierra',
    is_remote: false,
  },
  {
    id: '3',
    username: 'bob',
    full_handle: 'bob@planeta-tierra',
    email: 'bob@tierra.com',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    bio: 'Fotografo viajero 📸',
    avatar_url: 'https://i.pravatar.cc/150?img=3',
    password: 'bob1234',
    server: 'planeta-tierra',
    is_remote: false,
  },
  {
    id: '4',
    username: 'carlos',
    full_handle: 'carlos@planeta-tierra',
    email: 'carlos@tierra.com',
    created_at: new Date(Date.now() - 259200000).toISOString(),
    bio: 'Desarrollador full-stack 💻',
    avatar_url: 'https://i.pravatar.cc/150?img=4',
    password: 'carlos1234',
    server: 'planeta-tierra',
    is_remote: false,
  },
];

const marteUsers = [
  {
    id: '1',
    username: 'ares',
    full_handle: 'ares@planeta-marte',
    email: 'ares@marte.com',
    created_at: new Date().toISOString(),
    bio: 'Colono de la primera generación marciana',
    avatar_url: 'https://i.pravatar.cc/150?img=11',
    password: 'ares1234',
    server: 'planeta-marte',
    is_remote: false,
  },
  {
    id: '2',
    username: 'nova',
    full_handle: 'nova@planeta-marte',
    email: 'nova@marte.com',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    bio: 'Geóloga marciana y exploradora de cráteres',
    avatar_url: 'https://i.pravatar.cc/150?img=12',
    password: 'nova1234',
    server: 'planeta-marte',
    is_remote: false,
  },
  {
    id: '3',
    username: 'sol',
    full_handle: 'sol@planeta-marte',
    email: 'sol@marte.com',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    bio: 'Ingeniero de terraformación 🔧',
    avatar_url: 'https://i.pravatar.cc/150?img=13',
    password: 'sol1234',
    server: 'planeta-marte',
    is_remote: false,
  },
  {
    id: '4',
    username: 'lyra',
    full_handle: 'lyra@planeta-marte',
    email: 'lyra@marte.com',
    created_at: new Date(Date.now() - 259200000).toISOString(),
    bio: 'Astrónoma y fotógrafa del cielo marciano 🌌',
    avatar_url: 'https://i.pravatar.cc/150?img=14',
    password: 'lyra1234',
    server: 'planeta-marte',
    is_remote: false,
  },
];

const tierraPosts = [
  {
    author: 'alice',
    content:
      '¡Acabamos de descubrir una nueva especie de mariposa! 🦋 Los resultados de la investigación serán increíbles.',
    visibility: 'public',
    timestamp: Date.now() - 3600000,
  },
  {
    author: 'bob',
    content:
      'Atardecer perfecto en las montañas. Nada como la naturaleza para relajarse 🏔️',
    visibility: 'public',
    timestamp: Date.now() - 7200000,
  },
  {
    author: 'carlos',
    content:
      'Acabo de lanzar mi nuevo proyecto open-source. ¡Espero que les guste! https://github.com/carlos/proyecto',
    visibility: 'public',
    timestamp: Date.now() - 10800000,
  },
  {
    author: 'alice',
    content:
      'En la conferencia de ciencia, aprendí técnicas fascinantes. El futuro de la biotecnología es prometedor ',
    visibility: 'public',
    timestamp: Date.now() - 14400000,
  },
  {
    author: 'bob',
    content:
      'Fotografía urbana: cuando la arquitectura se convierte en arte 🏙️',
    visibility: 'public',
    timestamp: Date.now() - 18000000,
  },
  {
    author: 'carlos',
    content:
      'Tips de productividad: 1) Planificar tu día 2) Eliminar distracciones 3) Tomar descansos regulares',
    visibility: 'public',
    timestamp: Date.now() - 21600000,
  },
  {
    author: 'raul',
    content:
      'Hoy empecé una nueva ruta de senderismo por el bosque. La señal de móvil es mala, pero las vistas lo compensan todo 🌲',
    visibility: 'public',
    timestamp: Date.now() - 25200000,
  },
  {
    author: 'alice',
    content:
      'Recordatorio: la revisión por pares no es un ataque personal, es cómo mejora la ciencia. ¡Abrazad las críticas! 🧪',
    visibility: 'public',
    timestamp: Date.now() - 28800000,
  },
];

const martePosts = [
  {
    author: 'nova',
    content:
      'Hoy exploré el cráter Hellas. Las formaciones rocosas son completamente distintas a cualquier cosa en la Tierra 🪨',
    visibility: 'public',
    timestamp: Date.now() - 3600000,
  },
  {
    author: 'sol',
    content:
      'Los sistemas de presurización del domo B están al 98% de eficiencia. Otro día más respirando en Marte 🔧',
    visibility: 'public',
    timestamp: Date.now() - 7200000,
  },
  {
    author: 'lyra',
    content:
      'Las lunas Fobos y Deimos esta noche estaban perfectamente alineadas. Nunca me canso de este cielo 🌌',
    visibility: 'public',
    timestamp: Date.now() - 10800000,
  },
  {
    author: 'ares',
    content:
      'Primer cultivo de patatas marcianas cosechado con éxito. El suelo marciano da más trabajo, pero lo conseguimos 🥔',
    visibility: 'public',
    timestamp: Date.now() - 14400000,
  },
  {
    author: 'nova',
    content:
      'Muestra de mineral recogida a 40km de la base. Posibles trazas de agua antigua. Análisis en curso...',
    visibility: 'public',
    timestamp: Date.now() - 18000000,
  },
  {
    author: 'lyra',
    content:
      'Tormenta de polvo en el horizonte este. Todos a las esclusas, protocolo de tormenta activado 🌪️',
    visibility: 'public',
    timestamp: Date.now() - 21600000,
  },
  {
    author: 'sol',
    content:
      'Reparado el panel solar 7 tras la tormenta. Tres horas en traje EVA, pero la base vuelve a estar al 100% de energía ⚡',
    visibility: 'public',
    timestamp: Date.now() - 25200000,
  },
  {
    author: 'ares',
    content:
      'Un año exacto desde que pisé Marte por primera vez. Sigue sin parecerme real cada amanecer rojo 🔴',
    visibility: 'public',
    timestamp: Date.now() - 28800000,
  },
];

// const tierraRankings = [
//   {
//     id: randomUUID(),
//     title: 'Más activos esta semana',
//     visibility: 'public',
//     users: ['raul', 'alice', 'bob', 'carlos'],
//   },
//   {
//     id: randomUUID(),
//     title: 'Mejores exploradores',
//     visibility: 'public',
//     users: ['alice', 'bob', 'carlos'],
//   },
// ];

// const marteRankings = [
//   {
//     id: randomUUID(),
//     title: 'Más activos esta semana',
//     visibility: 'public',
//     users: ['ares', 'nova', 'sol', 'lyra'],
//   },
//   {
//     id: randomUUID(),
//     title: 'Mejores colonos',
//     visibility: 'public',
//     users: ['nova', 'ares', 'lyra'],
//   },
// ];

const tierraFollows = [
  { from: 'raul', to: 'alice' },
  { from: 'raul', to: 'bob' },
  { from: 'alice', to: 'raul' },
  { from: 'alice', to: 'carlos' },
  { from: 'bob', to: 'alice' },
  { from: 'carlos', to: 'raul' },
];

const marteFollows = [
  { from: 'ares', to: 'nova' },
  { from: 'ares', to: 'lyra' },
  { from: 'nova', to: 'ares' },
  { from: 'nova', to: 'sol' },
  { from: 'sol', to: 'lyra' },
  { from: 'lyra', to: 'ares' },
];

async function seedData() {
  const session = driver.session();

  const isMarte = planeta === 'marte';
  const users = isMarte ? marteUsers : tierraUsers;
  const posts = isMarte ? martePosts : tierraPosts;
  const follows = isMarte ? marteFollows : tierraFollows;
  // const rankings = isMarte ? marteRankings : tierraRankings;
  const [likeUser1, likeAuthor1, likeUser2, likeAuthor2] = isMarte
    ? ['ares', 'nova', 'nova', 'sol']
    : ['raul', 'alice', 'alice', 'bob'];
  const testUser = isMarte
    ? 'ares@planeta-marte / password: ares1234'
    : 'raul@planeta-tierra / password: raul1234';

  try {
    console.log('Iniciando seed de datos...\n');

    // 1. Limpiar datos existentes (opcional, comentar si quieres preservar)
    console.log(' Limpiando datos anteriores...');
    await session.run('MATCH (n) DETACH DELETE n');

    // 2. Crear usuarios
    console.log(' Creando usuarios...');

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await session.run(
        `CREATE (u:User {
          id: $id,
          username: $username,
          full_handle: $fullHandle,
          email: $email,
          password: $password,
          created_at: $createdAt,
          bio: $bio,
          avatar_url: $avatarUrl,
          server: $server,
          is_remote: $isRemote
        })`,
        {
          id: user.id,
          username: user.username,
          fullHandle: user.full_handle,
          email: user.email,
          password: hashedPassword,
          createdAt: user.created_at,
          bio: user.bio,
          avatarUrl: user.avatar_url,
          server: user.server,
          isRemote: user.is_remote,
        },
      );
    }
    console.log(
      `Usuarios creados: ${users.map((u) => u.username).join(', ')}\n`,
    );

    // 3. Crear relaciones de FOLLOWS
    console.log(' Creando relaciones de seguimiento...');

    for (const follow of follows) {
      await session.run(
        `MATCH (from:User {username: $from})
         MATCH (to:User {username: $to})
         CREATE (from)-[:FOLLOWS {status: 'accepted', created_at: datetime()}]->(to)`,
        { from: follow.from, to: follow.to },
      );
    }
    console.log('Relaciones de FOLLOWS creadas\n');

    // 4. Crear posts
    console.log(' Creando posts...');

    const serverName = isMarte ? 'planeta-marte' : 'planeta-tierra';

    for (const post of posts) {
      const createdAt = new Date(post.timestamp).toISOString();
      const authorHandle = `${post.author}@${serverName}`;

      await session.run(
        `MATCH (author:User {username: $author})
         CREATE (p:Post {
           id: $id,
           content: $content,
           author_handle: $authorHandle,
           is_remote: false,
           likes_count: 0,
           shares_count: 0,
           visibility: $visibility,
           created_at: datetime($createdAt),
           updated_at: datetime($createdAt)
         })
         CREATE (author)-[:AUTHORED]->(p)`,
        {
          author: post.author,
          id: randomUUID(),
          content: post.content,
          authorHandle,
          createdAt,
          visibility: post.visibility,
        },
      );
    }
    console.log(`${posts.length} Posts creados\n`);

    // 5. Crear algunos likes
    console.log(' Agregando likes a posts...');

    await session.run(
      `
      MATCH (post:Post)<-[:AUTHORED]-(author:User {username: $author})
      MATCH (user:User {username: $user})
      WITH post, user LIMIT 2
      CREATE (user)-[:LIKES {created_at: datetime()}]->(post)
      SET post.likes_count = post.likes_count + 1
    `,
      { author: likeAuthor1, user: likeUser1 },
    );

    await session.run(
      `
      MATCH (post:Post)<-[:AUTHORED]-(author:User {username: $author})
      MATCH (user:User {username: $user})
      WITH post, user LIMIT 2
      CREATE (user)-[:LIKES {created_at: datetime()}]->(post)
      SET post.likes_count = post.likes_count + 1
    `,
      { author: likeAuthor2, user: likeUser2 },
    );

    console.log('Likes agregados\n');

    // // 6. Crear rankings
    // console.log(' Creando rankings...');

    // for (const ranking of rankings) {
    //   await session.run(
    //     `CREATE (r:Ranking {
    //        id: $id,
    //        title: $title,
    //        created_at: $createdAt,
    //        visibility: $visibility
    //      })`,
    //     {
    //       id: ranking.id,
    //       title: ranking.title,
    //       createdAt: new Date().toISOString(),
    //       visibility: ranking.visibility,
    //     },
    //   );

    //   for (let i = 0; i < ranking.users.length; i++) {
    //     await session.run(
    //       `MATCH (r:Ranking {id: $id})
    //        MATCH (u:User {username: $username})
    //        CREATE (r)-[:INCLUDES {position: $position}]->(u)`,
    //       { id: ranking.id, username: ranking.users[i], position: i + 1 },
    //     );
    //   }
    // }
    // console.log(`${rankings.length} Rankings creados\n`);

    // 7. Mostrar estadísticas
    console.log('Estadísticas finales:');

    const userCount = await session.run(
      'MATCH (u:User) RETURN COUNT(u) as count',
    );
    const postCount = await session.run(
      'MATCH (p:Post) RETURN COUNT(p) as count',
    );
    const followCount = await session.run(
      'MATCH ()-[:FOLLOWS]->() RETURN COUNT(*) as count',
    );
    const likeCount = await session.run(
      'MATCH ()-[:LIKES]->() RETURN COUNT(*) as count',
    );

    console.log(`    Usuarios: ${userCount.records[0].get('count')}`);
    console.log(`    Posts: ${postCount.records[0].get('count')}`);
    console.log(`    Follows: ${followCount.records[0].get('count')}`);
    console.log(`    Likes: ${likeCount.records[0].get('count')}\n`);

    console.log(' ¡Seed completado exitosamente!');
    console.log(`   Usuario de prueba: ${testUser}`);
  } catch (error) {
    console.error(' Error durante seed:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

void seedData();
