(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.factory("adminAPI", function($http) {
		/*let _postLoginAdmin = function(username,password) {
		 	const request = {
		 		url: '/login',
		 		method: 'POST',
		 		data: {
		 			username: username,
		 			password: password
		 		}
		 	}
		 	return $http(request);
		};*/
		let _postEdit = function(edit){
			const request = {
				url: '/admin/edit',
				method: 'POST',
				data: edit
			}
			return $http(request);
		}
		let _getEdits = function(){
			const request = {
				url:'/admin/editar',
				method: 'GET'
			}
			return $http(request);
		}

		let _getTodosProjetos = function(ano) {
			const request = {
				url: '/admin/projetos',
				method: 'GET',
				data: {ano: ano}
			}
			console.log("REQUEST:"+JSON.stringify(request));
			return $http(request);
		};

		let _getTodosSaberes = function() {
			const request = {
				url: '/admin/saberes',
				method: 'POST',
			}
			return $http(request);
		};

		let _getTodosAvaliadores = function() {
			const request = {
				url: '/admin/avaliador',
				method: 'POST',
			}
			return $http(request);
		};

		let _putSetAprovados = function(arrayProjetosAprovados,arrayProjetosReprovados) {

			console.log("sera que da pra fazer log?: " + arrayProjetosAprovados);
			const request = {
				url: '/admin/upgreice',
				method: 'PUT',
				data: {
					projetosAprovados: arrayProjetosAprovados,
					projetosReprovados: arrayProjetosReprovados
				}
			}
			return $http(request);
		};

		let _putSetAvaliadores = function(arrayAvaliadoresMarcados,arrayAvaliadoresNMarcados) {
			const request = {
				url: '/admin/upgreiceAvaliadores',
				method: 'PUT',
				data: {
					avaliadoresMarcados: arrayAvaliadoresMarcados,
					avaliadoresNMarcados: arrayAvaliadoresNMarcados
				}
			}
			return $http(request);
		};

		let _putUnsetAprovados = function(projeto) {
			const request = {
				url: '/admin/upgreice2',
				method: 'PUT',
				data: projeto
			}
			return $http(request);
		};

		let _postConfirmacao = function(idProjeto,situacao) {
			const request = {
				url: '/projetos/confirma/'+idProjeto+'/'+situacao,
				method: 'POST'
			}
			return $http(request);
		};

		// let _getEscolasSaberes = function() {
		// 	const request = {
		// 		url: '/saberes-docentes/registro',
		// 		method: 'GET',
		// 	}
		// 	return $http(request);
		// };

		// let _saveSaberesDocentes = function(saberes) {
		// 	const request = {
		// 		url: '/saberes-docentes/registro',
		// 		method: 'POST',
		// 		data: saberes
		// 	}
		// 	return $http(request);
		// };

		let _saveAvaliador = function(avaliador) {
			const request = {
				url: '/avaliadores/registro',
				method: 'POST',
				data: avaliador
			}
			return $http(request);
		};

		let _putPresencaProjetos = function(arrayIntegrantesPresentes,arrayIntegrantesAusentes) {
			const request = {
				url: '/admin/setPresencaProjetos',
				method: 'PUT',
				data: {
					integrantesPresentes: arrayIntegrantesPresentes,
					integrantesAusentes: arrayIntegrantesAusentes
				}
			}
			return $http(request);
		};
	
		let _putPremiadoProjetos = function(premiacao){
			const request = {
				url: '/admin/setPremiadoProjetos',
				method: 'PUT',
				data: premiacao
			}
			return $http(request);
		}

		let _postEvento = function(evento) {
			const request = {
				url: '/admin/criarEvento',
				method: 'POST',
				data: evento
			}
			return $http(request);
		};

		let _getEventos = function() {
			const request = {
				url: '/admin/mostraEvento',
				method: 'GET'
			}
			return $http(request);
		};

		let _getAvaliadores = function() {
			const request = {
				url: '/admin/mostraAvaliadores',
				method: 'GET'
			}
			return $http(request);
		};

		let _putRemoveEvento = function(id) {
			const request = {
				url: '/admin/removeEvento',
				method: 'PUT',
				data: { id: id }
			}
			return $http(request);
		};

		let _putRemoveAvaliador = function(id) {
			const request = {
				url: '/admin/removeAvaliador',
				method: 'PUT',
				data: { id: id }
			}
			return $http(request);
		};

		let _postParticipante = function(participante) {
			const request = {
				url: '/admin/criarParticipante',
				method: 'POST',
				data: participante
			}
			return $http(request);
		};

		let _getParticipantes = function() {
			const request = {
				url: '/admin/mostraParticipante',
				method: 'GET'
			}
			return $http(request);
		};

		let _putRemoveParticipante = function(id) {
			const request = {
				url: '/admin/removeParticipante',
				method: 'PUT',
				data: { id: id }
			}
			return $http(request);
		};

		let _putAtualizaParticipante = function(participante) {
			const request = {
				url: '/admin/atualizaParticipante',
				method: 'PUT',
				data: participante
			}
			return $http(request);
		};

		let _getCPFparticipantes = function() {
			const request = {
				url: '/admin/mostraCPFparticipantes',
				method: 'GET'
			}
			return $http(request);
		};

		let _getCPFsaberes = function() {
			const request = {
				url: '/admin/mostraCPFsaberes',
				method: 'GET'
			}
			return $http(request);
		};
		

		return {
			//postLoginAdmin: _postLoginAdmin,
			postEdit: _postEdit,
			getTodosProjetos: _getTodosProjetos,
			getEdits: _getEdits,
			getTodosSaberes: _getTodosSaberes,
			getTodosAvaliadores: _getTodosAvaliadores,
			putSetAprovados: _putSetAprovados,
			putSetAvaliadores: _putSetAvaliadores,
			putUnsetAprovados: _putUnsetAprovados,
			postConfirmacao: _postConfirmacao,
			// getEscolasSaberes: _getEscolasSaberes,
			// saveSaberesDocentes: _saveSaberesDocentes,
			saveAvaliador: _saveAvaliador,
			putPresencaProjetos: _putPresencaProjetos,
			putPremiadoProjetos: _putPremiadoProjetos,
			postEvento: _postEvento,
			getEventos: _getEventos,
			getAvaliadores: _getAvaliadores,
			putRemoveEvento: _putRemoveEvento,
			postParticipante: _postParticipante,
			getParticipantes: _getParticipantes,
			putRemoveParticipante: _putRemoveParticipante,
			putRemoveAvaliador: _putRemoveAvaliador,
			putAtualizaParticipante: _putAtualizaParticipante,
			getCPFparticipantes: _getCPFparticipantes,
			getCPFsaberes: _getCPFsaberes
		};
	});
})();
