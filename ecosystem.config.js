module.exports = {
  apps: [{
    name: 'pdiap',
    script: 'npm',
    args: 'start',
    cwd: '/home/geovane/PDIAP',
    // Precisa bater com o "reverse_proxy localhost:XXXX" do pdiap em /etc/caddy/Caddyfile no servidor.
    env: { PORT: '3000' }
  }]
};
