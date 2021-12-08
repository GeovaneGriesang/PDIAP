(function(){
	'use strict';

	angular
	.module('PDIAP')
	.factory("projetosAPI", function($http) {
		 
		let _getEdits = function(){
			const request = {
				url:'/edit',
				method: 'GET',
			}
			return $http(request);
		}

		let _getOpcoes = function(){
			const request = {
				url:'/getOpcoes',
				method: 'GET',
			}
			return $http(request);
		}		

		let _saveProjeto = function(projeto) {
		 	const request = {
		 		url: '/registro',
		 		method: 'POST',
		 		data: projeto
		 	}
		 	return $http(request);
		 };

		let _saveSaberesDocentes = function(saberes) {
			const request = {
				url: '/saberes-docentes/registro',
				method: 'POST',
				data: saberes
			}
			return $http(request);
		};

		let _saveAvaliador = function(avaliador) {
			const request = {
				url: '/avaliadores/registro',
				method: 'POST',
				data: avaliador
			}
			return $http(request);
		};

		 let _postLogin = function(username,password) {
		 	const request = {
		 		url: '/login',
		 		method: 'POST',
		 		data: {
		 			username: username,
		 			password: password
		 		}
		 	}
		 	return $http(request);
		 };

		let _getProjeto = function() {
			const request = {
				url: '/projetos/loggedin',
				method: 'GET',
			}
			return $http(request);
		};

		let _getCategorias = function() {
			const request = {
				url: 'assets/js/categorias-eixos.json',
				method: 'GET',
			}
			return $http(request);
		};

		let _getEstados = function() {
			const request = {
				url: 'assets/js/estados-cidades.json',
				method: 'GET',
			}
			return $http(request);
		};

		let _getUsersEscolas = function() {
			const request = {
				url: '/registro',
				method: 'GET',
			}
			return $http(request);
		};

		let _getEscolasSaberes = function() {
			const request = {
				url: '/saberes-docentes/registro',
				method: 'GET',
			}
			return $http(request);
		};

		 let _putProjeto = function(projeto) {
		 	const request = {
		 		url: '/projetos/update',
		 		method: 'PUT',
		 		data: projeto
		 	}
		 	return $http(request);
		 };

		let _putIntegrante = function(integrante) {
			const request = {
				url: '/projetos/upgreice',
				method: 'PUT',
				data: integrante
			}
			return $http(request);
		};

		let _removeIntegrante = function(integrante) {
			const request = {
				url: '/projetos/removerIntegrante',
				method: 'PUT',
				data: integrante
			}
			return $http(request);
		};

		let _postRedefinir = function(username) {
			const request = {
				url: '/redefinir-senha',
				method: 'POST',
				data: username
			}
			return $http(request);
		};

		let _postNewPassword = function(password,token) {
			const request = {
				url: '/nova-senha/'+token,
				method: 'POST',
				data: password
			}
			return $http(request);
		};

		let _postContato = function(contato) {
			const request = {
				url: '/contato',
				method: 'POST',
				data: contato
			}
			return $http(request);
		};

		let _postCertificado = function(cpf) {
			const request = {
				url: '/emitirCertificado',
				method: 'POST',
				data: {cpf: cpf}
			}
			return $http(request);
		};

		let _postConferirCertificado = function(token) {
			const request = {
				url: '/conferirCertificado',
				method: 'POST',
				data: {id: token}
			}
			return $http(request);
		};

		//Get na API para retornar os dados das mostras e certificados 
		let _getMostra = function(){
			const request= {
				url: '/getMostraInfo',
				method: 'GET',
			};
			return $http(request);
		}
		
		//Mateus Roberto Algayer - 07/12/2021
		let _getDocumentos = function(){
			const request = {
				url: '/getDocumentosInfo',
				method: 'GET',
			}
			return $http(request);
		}

		return {
			getEdits: _getEdits,
			getOpcoes: _getOpcoes,
			saveProjeto: _saveProjeto,
			saveSaberesDocentes: _saveSaberesDocentes,
			saveAvaliador: _saveAvaliador,
			postLogin: _postLogin,
			getProjeto: _getProjeto,
			getCategorias: _getCategorias,
			getEstados: _getEstados,
			getUsersEscolas: _getUsersEscolas,
			getEscolasSaberes: _getEscolasSaberes,
			//Descomentar para salvar alterações dos projetos inscritos
			putProjeto: _putProjeto,
			putIntegrante: _putIntegrante,
			postRedefinir: _postRedefinir,
			postNewPassword: _postNewPassword,
			postContato: _postContato,
			removeIntegrante: _removeIntegrante,
			postCertificado: _postCertificado,
			postConferirCertificado: _postConferirCertificado,
			getMostra: _getMostra,
			getDocumentos: _getDocumentos,
		};
	});
})();
