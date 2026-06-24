const puppeteer = require('puppeteer');
const path = require('path');
const express = require('express');

const PORT = 3001;

(async () => {
  // start express static server to serve project files
  const app = express();
  app.use(express.static(path.resolve(__dirname, '..')));
  const server = app.listen(PORT, () => console.log('Static server listening on', PORT));

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  const url = `http://localhost:${PORT}/public/views/inscricao.html`;
  console.log('Loading', url);
  await page.goto(url, { waitUntil: 'networkidle2' });

  // wait for angular and controller
  await page.waitForFunction(() => {
    return (window.angular !== undefined) && (document.querySelector('[data-ng-controller="registroCtrl"], [ng-controller="registroCtrl"]') !== null);
  }, { timeout: 20000 });

  const result = await page.evaluate(() => {
    try {
      const el = document.querySelector('[data-ng-controller="registroCtrl"], [ng-controller="registroCtrl"]');
      const scope = angular.element(el).scope();
      // ensure projeto object exists
      scope.$apply(function() {
        if (!scope.projeto) scope.projeto = {};
      });

      // Add a second student (aluno)
      scope.$apply(function() {
        if (typeof scope.addAluno === 'function') scope.addAluno();
      });

      // Set distinct nacionalidades
      scope.$apply(function() {
        scope.projeto.nomeAluno1 = 'Aluno 1';
        scope.projeto.nacionalidadeAluno1 = 'brasileiro';
        scope.projeto.nomeAluno2 = 'Aluno 2';
        scope.projeto.nacionalidadeAluno2 = 'paraguaio';
      });

      // Change aluno2 nacionalidade and verify aluno1 remains
      scope.$apply(function() {
        scope.projeto.nacionalidadeAluno2 = 'uruguaio';
      });

      return {
        n1: scope.projeto.nacionalidadeAluno1,
        n2: scope.projeto.nacionalidadeAluno2,
        equal: scope.projeto.nacionalidadeAluno1 === scope.projeto.nacionalidadeAluno2
      };
    } catch (e) {
      return { error: e.message };
    }
  });

  console.log('Result:', result);

  await browser.close();
  server.close();

  if (result.error) {
    console.error('Test failed:', result.error);
    process.exit(2);
  }

  if (result.equal) {
    console.error('Test failed: nacionalidades are equal (unexpected)');
    process.exit(1);
  }

  console.log('Test passed: nacionalidades are independent');
  process.exit(0);
})();
