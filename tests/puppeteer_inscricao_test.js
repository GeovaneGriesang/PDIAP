const puppeteer = require('puppeteer');

(async ()=> {
  const url = 'http://localhost/projetos/inscricao';
  const browser = await puppeteer.launch({args: ['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  await page.setRequestInterception(true);
  let intercepted = { saved:false, postData: null, status: null };
  page.on('request', req => {
    if (req.method() === 'POST') {
      intercepted.saved = true;
      intercepted.postData = req.postData();
      intercepted.url = req.url();
      // respond with fake success to registration endpoint if matching, else passthrough
      if (req.url().endsWith('/registro') || req.url().indexOf('/registro') !== -1) {
        req.respond({status: 200, contentType: 'application/json', body: JSON.stringify({ok:true})});
      } else {
        req.continue();
      }
    } else {
      req.continue();
    }
  });

  await page.goto(url, {waitUntil: 'networkidle2', timeout: 30000});
  await page.waitForSelector('input[name=nomeAluno1]', {timeout: 10000});

  // get bounding boxes for name and email inputs
  const boxName = await page.$eval('input[name=nomeAluno1]', el => el.getBoundingClientRect().toJSON());
  const boxEmail = await page.$eval('input[name=emailAluno1]', el => el.getBoundingClientRect().toJSON());

  const overlap = !(
    boxName.bottom <= boxEmail.top ||
    boxEmail.bottom <= boxName.top ||
    boxName.right <= boxEmail.left ||
    boxEmail.right <= boxName.left
  );

  // Test CPF validation: enter invalid, then valid
  try {
    await page.click('input[name=cpfAluno1]');
    await page.type('input[name=cpfAluno1]', '123', {delay: 50});
    await page.focus('input[name=nomeAluno1]');
    await page.waitForTimeout(500);
  } catch (e) {
    // ignore if selector not found
  }

  const cpfInvalidClass = await page.evaluate(() => {
    const el = document.querySelector('input[name=cpfAluno1]');
    return el ? el.className : null;
  });

  // enter a valid CPF and blur
  try {
    await page.click('input[name=cpfAluno1]', {clickCount: 3});
    await page.type('input[name=cpfAluno1]', '111.444.777-35', {delay: 50});
    await page.focus('input[name=nomeAluno1]');
    await page.waitForTimeout(500);
  } catch (e) {}

  const cpfValidClass = await page.evaluate(() => {
    const el = document.querySelector('input[name=cpfAluno1]');
    return el ? el.className : null;
  });

  console.log(JSON.stringify({overlap, boxName, boxEmail, cpfInvalidClass, cpfValidClass}, null, 2));

  // Now test submit: call registrarProjeto from angular scope with minimal data
  try {
    await page.evaluate(() => {
      const form = document.querySelector('form[name="projetoForm"]');
      const scopeEl = form || document.body;
      const scope = angular.element(scopeEl).scope();
      if (!scope) return 'no-scope';
      scope.$apply(function(){
        scope.projeto = {
          nomeProjeto: 'Teste Puppeteer',
          resumo: 'a'.repeat(500),
          nomeAluno1: 'Aluno Teste',
          emailAluno1: 'aluno@test.com',
          cpfAluno1: '11144477735',
          categoria: (scope.listaCategorias && scope.listaCategorias.length) ? scope.listaCategorias[0].categoria : 'Categoria Teste',
          eixo: (scope.eixos && scope.eixos.length) ? scope.eixos[0] : 'Eixo Teste'
        };
        scope.loginHabilitado = true;
        scope.palavrasChave = ['teste'];
      });
      return 'ok';
    });

    // call registrarProjeto
    const invoked = await page.evaluate(() => {
      try {
        const form = document.querySelector('form[name="projetoForm"]');
        const el = form || document.querySelector('[ng-controller="registroCtrl"]') || document.body;
        const scope = angular.element(el).scope();
        if (!scope || typeof scope.registrarProjeto !== 'function') return {ok:false, reason:'no-func'};
        scope.registrarProjeto(scope.projeto);
        return {ok:true};
      } catch (e) {
        return {ok:false, reason: e.toString()};
      }
    });
    console.log('invoke result:', invoked);

    // wait a moment for intercepted request
    await page.waitForTimeout(800);
  } catch (e) {
    // ignore
  }

  console.log('intercepted:', intercepted);

  await browser.close();
  process.exit(0);

})().catch(err => { console.error(err); process.exit(2); });
