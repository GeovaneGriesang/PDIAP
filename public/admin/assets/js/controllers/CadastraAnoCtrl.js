//Esse script serve para cadastrar todos os anos dentro do sistema
//
var CadastraAno = function () {
  var Ano = []; //define o array Ano

  var data = new Date().getFullYear(); //define data e o preenche com o ano atual

  /*conta de 2016 até o ano seguinte ao atual (pra já dar pra cadastrar a Mostra do
	próximo ano) e através do comando "push()" insere os anos dentro do array ano*/
  for (var i = 2016; i <= data + 1; i++) {
    Ano.push(i);
  }
  return Ano; //especifica que a função deve retornar o array Ano
};