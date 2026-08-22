module.exports = {
  apps: [{
    name: 'pdiap',
    // Roda bin/www direto (sem passar por npm start -> nodemon): o Node em produção
    // já suporta nativamente a sintaxe usada no projeto, então babel-node nunca foi
    // necessário aqui - e sem nodemon não existe watcher de arquivos pra entrar em
    // corrida com "git pull" + "pm2 restart" e deixar um processo órfão preso na porta.
    script: 'bin/www',
    cwd: '/home/geovane/PDIAP',
    // Precisa bater com o "reverse_proxy localhost:XXXX" do pdiap em /etc/caddy/Caddyfile no servidor.
    env: { PORT: '3000' }
  }]
};
