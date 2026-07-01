const http = require('http');

const postData = new URLSearchParams({
  username: 'puppeteer_test_' + Date.now(),
  password: 'Pass1234',
  password2: 'Pass1234',
  nomeProjeto: 'Teste Submissão Real',
  categoria: 'Teste',
  eixo: 'Eixo Teste',
  nomeEscola: 'Escola Teste',
  cep: '12345-678',
  cidade: 'Cidade Teste',
  estado: 'TS',
  hospedagem: 'nao',
  email: 'teste+puppeteer@example.com',
  resumo: 'Resumo de teste de submissão real',
  'palavraChave[]': ['teste'],
  nomeOrientador1: 'Orientador Teste',
  emailOrientador1: 'orientador@example.com',
  cpfOrientador1: '12345678901',
  telefoneOrientador1: '11999999999',
  tamCamisetaOrientador1: 'M',
  nomeAluno1: 'Aluno Teste',
  emailAluno1: 'aluno@example.com',
  cpfAluno1: '98765432100',
  telefoneAluno1: '11988888888',
  tamCamisetaAluno1: 'M'
}).toString();

const options = {
  hostname: 'localhost',
  port: 80,
  path: '/registro',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log('HEADERS:', res.headers);
  let data = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Response body:', data);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
  process.exit(2);
});

req.write(postData);
req.end();
