'use strict';

// Substitui o pacote email-templates 2.x (de 2017, sem manutenção, puxava uma cadeia de
// dependências com vulnerabilidades conhecidas - juice 4 -> web-resource-inliner -> request).
// Mesma interface que as rotas já usavam: new EmailTemplate(pasta).render(locals, callback),
// com callback(err, {html, text}). Faz só o que o pacote antigo fazia com os modelos de
// templates/: renderiza html.ejs e embute o style.css nas tags (muitos clientes de e-mail
// ignoram <style>). Nenhum modelo tem text.ejs, então text continua sempre null.

const ejs = require('ejs')
,	juice = require('juice')
,	fs = require('fs')
,	path = require('path');

class EmailTemplate {
	constructor(dirname) {
		this.dirname = dirname;
	}

	render(locals, callback) {
		this.renderAsync(locals).then(
			(results) => callback(null, results),
			(err) => callback(err)
		);
	}

	async renderAsync(locals) {
		const html = await ejs.renderFile(path.join(this.dirname, 'html.ejs'), locals);
		const stylePath = path.join(this.dirname, 'style.css');
		const style = fs.existsSync(stylePath) ? await fs.promises.readFile(stylePath, 'utf8') : null;
		return {
			html: style ? juice.inlineContent(html, style) : juice(html),
			text: null
		};
	}
}

module.exports.EmailTemplate = EmailTemplate;
