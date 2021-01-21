//Para rodar o script -> mongo export.js > file_name.json

conn = new Mongo();
db = conn.getDB("loginapp");
var cur = db.projetos.find();


var tamanho = 0;
var vez = 1;
var isso = db.projetos.find();
var objeto;
while(isso.hasNext()){
    objeto = isso.next();
    if(objeto != null & objeto.numInscricao != null){
        if(objeto.integrantes[0].presenca != null && objeto.createdAt.getFullYear() == 2017){
            tamanho++;
        }
    }
}

var obj;
      
print("[");

while(cur.hasNext()){
    obj = cur.next();
    
    if(obj != null & obj.numInscricao != null){
        if(obj.integrantes[0].presenca != null && obj.createdAt.getFullYear() == 2017){
            var num = obj.integrantes.length;
        
            var ob = new Object();
            ob.nome = obj.nomeProjeto;
            
            if(obj.palavraChave != null){
                if(obj.palavraChave != ""){
                    ob.palavrasChave = obj.palavraChave.split(/[.,;]/, 3);   
                }
            }
            
            ob.resumo = obj.resumo;
            switch(obj.categoria){
                case "Ensino Médio, Técnico e Superior":
                    switch(obj.eixo){
                        case "Ciências Agrárias, Exatas e da Terra":
                            ob.areaNivel = 9;
                            break;
                        case "Ciências Ambientais, Biológicas e da Saúde":
                            ob.areaNivel = 10;
                            break;
                        case "Ciências Humanas e Sociais Aplicadas":
                            ob.areaNivel = 11;
                            break;
                        case "Línguas e Artes":
                            ob.areaNivel = 12;
                            break;
                        case "Extensão":
                            ob.areaNivel = 13;
                            break;
                        case "Ciências da Computação":
                            ob.areaNivel = 14;
                            break;
                        case "Engenharias":
                            ob.areaNivel = 15;
                            break;
                    }
                    break;
                case "Fundamental I (1º ao 5º anos)":
                    switch(obj.eixo){
                        case "Ciências da Natureza e suas tecnologias":
                            ob.areaNivel = 1;
                            break;
                        case "Ciências Humanas e suas tecnologias":
                            ob.areaNivel = 2;
                            break;
                        case "Linguagens, Códigos e suas tecnologias":
                            ob.areaNivel = 3;
                            break;
                        case "Matemática e suas tecnologias":
                            ob.areaNivel = 4;
                            break;
                    }
                    break;
                case "Fundamental II (6º ao 9º anos)":
                    switch(obj.eixo){
                        case "Ciências da Natureza e suas tecnologias":
                            ob.areaNivel = 5;
                            break;
                        case "Ciências Humanas e suas tecnologias":
                            ob.areaNivel = 6;
                            break;
                        case "Linguagens, Códigos e suas tecnologias":
                            ob.areaNivel = 7;
                            break;
                        case "Matemática e suas tecnologias":
                            ob.areaNivel = 8;
                            break;
                    }
                    break;
            }
            ob.escola = obj.nomeEscola;
            ob.escolaCidade = obj.cidade;
            if(obj.premiacao == "Premiado"){
                ob.premiado = 1;
            } else {
                ob.premiado = 0;
            }

            var tipoIntegrantes = "[";
            for(var x = 0; x < num; x++){
                if(obj.integrantes[x].tipo == "Orientador"){
                    tipoIntegrantes = tipoIntegrantes.concat(0);
                } else {
                    tipoIntegrantes = tipoIntegrantes.concat(1);
                }
                if(x != num-1){
                    tipoIntegrantes = tipoIntegrantes.concat(',');
                }
            }
            tipoIntegrantes = tipoIntegrantes.concat("]");
            ob.tipoIntegrantes = JSON.parse(tipoIntegrantes);

            var nomeIntegrantes = "[";
            for(var y = 0; y < num; y++){
                nomeIntegrantes = nomeIntegrantes.concat("\""+obj.integrantes[y].nome+"\"");
                if(y != num-1){
                    nomeIntegrantes = nomeIntegrantes.concat(',');
                }
            }
            nomeIntegrantes = nomeIntegrantes.concat("]");
            ob.nomeIntegrantes = JSON.parse(nomeIntegrantes);

            var emailIntegrantes = "[";
            for(var z = 0; z < num; z++){
                emailIntegrantes = emailIntegrantes.concat("\""+obj.integrantes[z].email+"\"");
                if(z != num-1){
                    emailIntegrantes = emailIntegrantes.concat(',');
                }
            }
            emailIntegrantes = emailIntegrantes.concat("]");
            ob.emailIntegrantes = JSON.parse(emailIntegrantes);

            var telefoneIntegrantes = "[";
            for(var a = 0; a < num; a++){
                telefoneIntegrantes = telefoneIntegrantes.concat(parseInt(obj.integrantes[a].telefone));
                if(a != num-1){
                    telefoneIntegrantes = telefoneIntegrantes.concat(',');
                }
            }
            telefoneIntegrantes = telefoneIntegrantes.concat("]");
            ob.telefoneIntegrantes = JSON.parse(telefoneIntegrantes);

            var issoaqui = JSON.stringify(ob);

            print(issoaqui);        

            if(vez!=tamanho){
                print(",");
            }
            vez++;
            
        }

    }
    
}

print("]");
