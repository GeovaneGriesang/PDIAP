const fs = require('fs');
const path = require('path');

const adminSchemaPath = path.join(__dirname, '..', 'models', 'admin-schema.js');
const adminCtrlPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'controllers', 'adminCtrl.js');
const source = fs.readFileSync(adminSchemaPath, 'utf8');
const controller = fs.readFileSync(adminCtrlPath, 'utf8');

if (!source.includes('upload: {type: Boolean}')) {
  console.error('A opção Upload não foi encontrada no schema de configurações.');
  process.exit(1);
}

if (!controller.includes('let construirMenu = function()') || !controller.includes("$scope.carregarOpcoes(function() {")) {
  console.error('O menu do dashboard não está reconstruindo a partir das opções do admin.');
  process.exit(1);
}

if (!controller.includes("if ($scope.opcoes.upload === true && $scope.projeto1.categoria === 'Ensino Médio, Técnico e Superior')")) {
  console.error('O item Upload não está sendo incluído dinamicamente no menu a partir das opções do admin.');
  process.exit(1);
}

if (controller.includes("if ($scope.projeto1.categoria === 'Ensino Médio, Técnico e Superior') {\n\t\t\t\t\t$scope.data = {")) {
  console.error('O menu ainda está usando um bloco fixo para o Upload em vez de reconstruir a partir das opções do admin.');
  process.exit(1);
}

console.log('Opção Upload presente e o menu do dashboard está ligado às opções do admin.');
