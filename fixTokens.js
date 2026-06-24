/**
 * PDIAP - Plataforma Digital de Inscrição e Administração de Projetos - Fase 6
 * Arquivo: fixTokens.js
 * * * Funcionamento Geral:
 * Este script automatiza a correção de tokens diretamente na coleção 'avaliadores'.
 * Ele busca registros onde o token está ausente, nulo ou vazio e gera um novo
 * ID único compatível com o MongoDB (ObjectId).
 * * * Partes importantes:
 * - mongoose.connection.db.collection('avaliadores'): Acessa a coleção nativa para
 * garantir que a alteração ocorra no nível do banco de dados, sem restrições de Schema.
 * - new mongoose.Types.ObjectId().valueOf(): Replicação exata do comando que funcionou.
 * * * Pontos que possam gerar dúvida:
 * - O uso de 'toArray()' e 'forEach' assíncrono garante que todos os documentos 
 * sejam processados antes de encerrar a rotina.
 * * * Alterado por: Geovane Griesang
 * Data: 07/04/2026
 * Descrição: Correção definitiva de tokens na coleção avaliadores baseada em comando manual funcional.
 */

const mongoose = require('mongoose');

async function corrigirTokensCertificados() {
    try {
        console.log("[Manutenção] Iniciando correção na coleção 'avaliadores'...");

        // Acessa a coleção diretamente via driver nativo para evitar conflitos de Schema
        const collection = mongoose.connection.db.collection('avaliadores');

        // Busca registros inconsistentes conforme o comando original
        const docs = await collection.find({
            $or: [
                { token: { $exists: false } },
                { token: null },
                { token: "" },
                { token: "undefined" }
            ]
        }).toArray();

        if (docs.length === 0) {
            console.log("[Manutenção] Verificação concluída: Nenhum registro inconsistente em 'avaliadores'.");
            return;
        }

        console.log(`[Manutenção] Corrigindo ${docs.length} registros...`);

        // Executa a atualização para cada documento encontrado
        const promessas = docs.map(doc => {
            const novoToken = new mongoose.Types.ObjectId().valueOf();
            
            return collection.updateOne(
                { _id: doc._id },
                { $set: { token: novoToken } }
            );
        });

        await Promise.all(promessas);

        console.log(`[Manutenção] ✅ Sucesso: ${docs.length} registros atualizados em 'avaliadores'.`);

    } catch (error) {
        console.error("[Manutenção] ❌ Erro crítico ao alterar o banco de dados:", error);
    }
}

module.exports = { corrigirTokensCertificados };