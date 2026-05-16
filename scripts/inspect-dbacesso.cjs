const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: '147.1.0.100',
    port: 3308,
    user: 'root',
    password: 'root',
    database: 'dbacesso',
  });

  const [perfTables] = await c.query("SHOW TABLES LIKE '%perf%'");
  console.log('=== TABELAS com perf ===');
  console.log(perfTables);

  const [menuTables] = await c.query("SHOW TABLES LIKE '%menu%'");
  console.log('=== TABELAS com menu ===');
  console.log(menuTables);

  const [us] = await c.query('SHOW COLUMNS FROM usuario_sistema');
  console.log('=== usuario_sistema ===');
  console.log(us.map((x) => x.Field + ':' + x.Type).join('\n'));

  // Sample dados para mduarte (id 466) em qualquer sistema
  const [muRows] = await c.query(
    'SELECT * FROM menu_usuario WHERE meus_usua_id = 466 LIMIT 20',
  );
  console.log('=== menu_usuario do mduarte (até 20) ===');
  console.log(muRows);

  // Sample de menus do sistema 25 (um que o mduarte tem acesso)
  const [menuSample] = await c.query(
    'SELECT * FROM menu WHERE menu_sist_id = 25 ORDER BY menu_ordem LIMIT 15',
  );
  console.log('=== menus do sistema 25 (sample) ===');
  console.log(menuSample);

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
