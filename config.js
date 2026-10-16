(function () {
    const TIPOS = {
        diario: {
            id: 'diario',
            chave: 'relatorio_diario',
            nome: 'Relatório Diário',
            docTitleFormulario: 'Relatório Diário',
            tituloFormulario: '📋 Relatório diário',
            docTitleServicos: 'Relatório Diário',
            tituloServicos: '📋 Histórico de relatórios',
            pdfTitulo: 'Relatório diário',
            pdfArquivo: 'Relatorio_Diario',
            rotuloBotaoAdicionar: '✓ Adicionar',
            rotuloBotaoAtualizar: '✓ Atualizar Serviço',
            rotuloAcessar: 'Acessar Relatórios ➔',
            campoAssunto: 'Assunto',
            campoAssuntoPlaceholder: 'Ex: Tópico do relatório',
            campoDescricao: 'Descrição do ocorrido',
            campoDescricaoPlaceholder: 'Descreva os detalhes do ocorrido...',
            campoConclusao: 'Conclusão',
            campoConclusaoPlaceholder: 'Insira as conclusões e observações finais...',
            prioridades: [
                { valor: 'urgente', texto: 'Urgente' },
                { valor: 'media', texto: 'Média' },
                { valor: 'baixa', texto: 'Baixa' },
                { valor: 'relatorio concluido', texto: 'Relatório concluído' }
            ]
        },
        manutencao: {
            id: 'manutencao',
            chave: 'servicosManutencao',
            nome: 'Relatório de Manutenção',
            docTitleFormulario: 'Relatório de Manutenção',
            tituloFormulario: '📋 Controle de Serviços de Manutenção',
            docTitleServicos: 'Relatório de Manutenção',
            tituloServicos: '📋 Serviços Registrados',
            pdfTitulo: 'Relatório de Serviços de Manutenção',
            pdfArquivo: 'Relatorio_Servicos',
            rotuloBotaoAdicionar: '✓ Adicionar Serviço',
            rotuloBotaoAtualizar: '✓ Atualizar Serviço',
            rotuloAcessar: 'Acessar Serviços ➔',
            campoAssunto: 'Assunto do Serviço',
            campoAssuntoPlaceholder: 'Ex: Manutenção do ar condicionado',
            campoDescricao: 'Descrição do Serviço',
            campoDescricaoPlaceholder: 'Descreva os detalhes do serviço realizado...',
            campoConclusao: 'Conclusão do Serviço',
            campoConclusaoPlaceholder: 'Insira as conclusões e observações finais...',
            prioridades: [
                { valor: 'urgente', texto: 'Urgente' },
                { valor: 'media', texto: 'Média' },
                { valor: 'baixa', texto: 'Baixa' },
                { valor: '', texto: 'Serviço executado' }
            ]
        }
    };

    const CHAVE_TIPO = 'tipoRelatorioAtual';
    const PADRAO = 'diario';

    function salvarPreferencia(tipo) {
        try {
            localStorage.setItem(CHAVE_TIPO, tipo);
        } catch (e) {
            /* ignora */
        }
    }

    function obterTipoAtual() {
        let tipo = null;
        try {
            tipo = new URLSearchParams(window.location.search).get('tipo');
        } catch (e) {
            /* ignora */
        }
        if (tipo && TIPOS[tipo]) {
            salvarPreferencia(tipo);
            return tipo;
        }
        let salvo = null;
        try {
            salvo = localStorage.getItem(CHAVE_TIPO);
        } catch (e) {
            /* ignora */
        }
        return TIPOS[salvo] ? salvo : PADRAO;
    }

    function obterConfig(tipo) {
        return TIPOS[tipo] || TIPOS[obterTipoAtual()];
    }

    function montarUrl(pagina, params) {
        const query = new URLSearchParams(Object.assign({ tipo: obterTipoAtual() }, params || {}));
        return `${pagina}?${query.toString()}`;
    }

    window.Relatorios = {
        TIPOS,
        PADRAO,
        CHAVE_TIPO,
        salvarPreferencia,
        obterTipoAtual,
        obterConfig,
        montarUrl
    };
})();
