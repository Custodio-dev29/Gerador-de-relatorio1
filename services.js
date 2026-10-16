document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES DO DOM ---
    const servicosList = document.getElementById('servicosList');
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeModalSpan = document.querySelector('.close-modal');
    const exportPdfBtn = document.querySelector('.btn-export');
    const importPdfBtn = document.querySelector('.btn-import');
    const pdfInput = document.getElementById('pdfInput');
    const deleteAllBtn = document.querySelector('.btn-delete-all');
    const filterPriorityInput = document.getElementById('filterPriority');
    const filterSetorInput = document.getElementById('filterSetor');
    const sortByInput = document.getElementById('sortBy');
    const btnListarSetores = document.getElementById('btnListarSetores');
    const tipoSelect = document.getElementById('tipoRelatorio');
    const tituloPagina = document.getElementById('tituloPagina');
    const linkVoltar = document.getElementById('linkVoltar');

    // --- ESTADO DA APLICAÇÃO ---
    let config = null;
    let servicos = [];

    // --- FUNÇÕES DE INICIALIZAÇÃO ---
    async function init() {
        config = window.Relatorios.obterConfig();
        aplicarConfig();
        servicos = await carregarServicos();
        configurarEventListeners();
        atualizarOpcoesSetor();
        renderizarServicos();
    }

    // Aplica os textos do tipo de relatório selecionado na tela
    function aplicarConfig() {
        document.title = config.docTitleServicos;
        if (tituloPagina) tituloPagina.textContent = config.tituloServicos;
        if (linkVoltar) linkVoltar.href = window.Relatorios.montarUrl('index.html');
        preencherTipoSelect();
        preencherFiltroPrioridade();
    }

    function preencherTipoSelect() {
        if (!tipoSelect) return;
        tipoSelect.innerHTML = Object.values(window.Relatorios.TIPOS)
            .map(t => `<option value="${t.id}"${t.id === config.id ? ' selected' : ''}>${escapeHtml(t.nome)}</option>`)
            .join('');
        tipoSelect.value = config.id;
        tipoSelect.addEventListener('change', () => {
            window.Relatorios.salvarPreferencia(tipoSelect.value);
            window.location.href = `services.html?tipo=${tipoSelect.value}`;
        });
    }

    function preencherFiltroPrioridade() {
        if (!filterPriorityInput) return;
        const opcoes = config.prioridades
            .map(p => `<option value="${escapeHtml(p.valor)}">${escapeHtml(p.texto)}</option>`)
            .join('');
        filterPriorityInput.innerHTML = `<option value="todos">Todas</option>${opcoes}`;
        filterPriorityInput.value = 'todos';
    }

    function configurarEventListeners() {
        // Delegação de eventos para botões de ação nos cards
        servicosList.addEventListener('click', handleServiceListClick);

        // Event listeners para o modal
        closeModalSpan.addEventListener('click', fecharModal);
        window.addEventListener('click', (event) => {
            if (event.target === imageModal) {
                fecharModal();
            }
        });

        // Event listeners para PDF
        exportPdfBtn.addEventListener('click', exportarParaPDF);
        importPdfBtn.addEventListener('click', () => pdfInput.click());
        pdfInput.addEventListener('change', importarDePDF);

        deleteAllBtn.addEventListener('click', excluirTodosServicos);
        // Event listener para o filtro
        filterPriorityInput.addEventListener('change', renderizarServicos);
        // Event listeners para filtro e classificação por setor
        if (filterSetorInput) filterSetorInput.addEventListener('change', renderizarServicos);
        if (sortByInput) sortByInput.addEventListener('change', renderizarServicos);
        if (btnListarSetores) btnListarSetores.addEventListener('click', mostrarListaSetores);
    }

    // --- FUNÇÕES AUXILIARES ---
    function escapeHtml(texto) {
        return String(texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Lista os setores distintos já cadastrados, em ordem alfabética
    function obterSetoresUnicos() {
        const setores = new Set();
        servicos.forEach(s => {
            if (s.setor && s.setor.trim()) setores.add(s.setor.trim());
        });
        return Array.from(setores).sort((a, b) => a.localeCompare(b));
    }

    // Atualiza as opções do filtro de setor preservando a seleção atual
    function atualizarOpcoesSetor() {
        if (!filterSetorInput) return;
        const valorAtual = filterSetorInput.value;
        const opcoes = obterSetoresUnicos()
            .map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
            .join('');
        filterSetorInput.innerHTML = `<option value="todos">Todos</option>${opcoes}`;
        const aindaExiste = Array.from(filterSetorInput.options).some(o => o.value === valorAtual);
        filterSetorInput.value = aindaExiste ? valorAtual : 'todos';
    }

    // Aplica os filtros (prioridade e setor) e a classificação (prioridade, setor ou data)
    function obterServicosProcessados() {
        const filterPriority = filterPriorityInput.value;
        const filterSetor = filterSetorInput ? filterSetorInput.value : 'todos';
        const sortBy = sortByInput ? sortByInput.value : 'prioridade';

        const lista = servicos.filter(servico => {
            const okPrioridade = filterPriority === 'todos' || servico.prioridade === filterPriority;
            const okSetor = filterSetor === 'todos' || (servico.setor || '') === filterSetor;
            return okPrioridade && okSetor;
        });

        // Ordem de prioridade (Urgente > Média > Baixa)
        const priorityOrder = { 'urgente': 1, 'media': 2, 'baixa': 3 };
        const prioridadeDe = (s) => priorityOrder[s.prioridade] || 4;

        lista.sort((a, b) => {
            if (sortBy === 'setor') {
                const setorA = (a.setor || '').toLowerCase();
                const setorB = (b.setor || '').toLowerCase();
                if (setorA !== setorB) return setorA.localeCompare(setorB);
            } else if (sortBy === 'data') {
                return b.id - a.id; // mais recente primeiro
            }

            // Padrão: prioridade; empate resolvido pelo mais recente
            if (prioridadeDe(a) !== prioridadeDe(b)) {
                return prioridadeDe(a) - prioridadeDe(b);
            }
            return b.id - a.id;
        });

        return lista;
    }

    // Exibe um resumo com a contagem de serviços por setor
    function mostrarListaSetores() {
        const setores = obterSetoresUnicos();
        if (setores.length === 0) {
            alert('Nenhum setor cadastrado ainda.');
            return;
        }
        const lista = setores.map(s => {
            const total = servicos.filter(x => (x.setor || '').trim() === s).length;
            return `- ${s} (${total} serviço${total !== 1 ? 's' : ''})`;
        }).join('\n');
        alert(`Setores cadastrados (${setores.length}):\n\n${lista}`);
    }

    // --- GERENCIAMENTO DE ESTADO (IndexedDB) ---
    function carregarServicos() {
        return window.RelatorioStorage.carregar(config.chave);
    }

    function salvarServicos() {
        return window.RelatorioStorage.salvar(config.chave, servicos);
    }

    // --- LÓGICA DE SERVIÇOS (CRUD) ---
    function editarServico(index) {
        const servicoId = servicos[index].id;
        // Redireciona para a página principal, passando o ID do serviço como parâmetro
        window.location.href = window.Relatorios.montarUrl('index.html', { edit: servicoId });
    }

    function excluirServico(index) {
        if (confirm(`Tem certeza que deseja excluir o serviço "${servicos[index].assunto}"?`)) {
            servicos.splice(index, 1);
            salvarServicos();
            renderizarServicos(); // Re-renderiza a lista na página atual
        }
    }

    function excluirTodosServicos() {
        if (servicos.length === 0) {
            alert("Não há serviços para excluir.");
            return;
        }

        if (confirm(`Tem certeza que deseja excluir TODOS os ${servicos.length} serviços registrados? Esta ação não pode ser desfeita.`)) {
            servicos = []; // Limpa o array de serviços
            salvarServicos(); // Atualiza o armazenamento com o array vazio
            renderizarServicos(); // Atualiza a interface
        }
    }

    function renderizarServicos() {
        // Mantém as opções de setor sincronizadas com os serviços cadastrados
        atualizarOpcoesSetor();

        const servicosFiltrados = obterServicosProcessados();

        if (servicosFiltrados.length === 0) {
            if (servicos.length === 0) {
            servicosList.innerHTML = '<div class="no-services">Nenhum serviço registrado ainda.</div>';
            } else {
                servicosList.innerHTML = '<div class="no-services">Nenhum serviço encontrado para este filtro.</div>';
            }
            return;
        }

        servicosList.innerHTML = servicosFiltrados.map(s => `
            <div class="service-card priority-${s.prioridade || 'media'}" data-id="${s.id}">
                <div class="service-card-header">
                    <h3>${s.assunto}</h3>
                    <span class="priority-text">${s.prioridade ? s.prioridade.charAt(0).toUpperCase() + s.prioridade.slice(1) : 'Não definida'}</span>
                </div>
                <div class="service-card-body">
                    ${s.setor ? `
                    <div class="service-field">
                        <span class="service-field-label">Setor</span>
                        <p class="service-field-value">${s.setor}</p>
                    </div>` : ''}
                    <div class="service-field">
                        <span class="service-field-label">Descrição</span>
                        <p class="service-field-value">${s.descricao}</p>
                    </div>
                    <div class="service-field">
                        <span class="service-field-label">Conclusão</span>
                        <p class="service-field-value">${s.conclusao}</p>
                    </div>
                    ${s.imagens.length > 0 ? `
                        <div class="service-card-images">
                            ${s.imagens.map(imgData => `
                                <div class="thumbnail-container">
                                    <img src="${imgData.src || imgData}" alt="Miniatura" class="service-card-thumbnail">
                                    ${imgData.caption ? `<p class="thumbnail-caption">${imgData.caption}</p>` : ''}
                                </div>
                            `).join('')}
                        </div>` : ''}
                </div>
                <div class="service-card-footer">
                    <span class="service-date">🕓 Registrado em: ${s.data}</span>
                    <div class="service-card-actions">
                        <button class="btn-edit" data-id="${s.id}">✏️ Editar</button>
                        <button class="btn-delete" data-id="${s.id}">🗑️ Excluir</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function handleServiceListClick(event) {
        const target = event.target;
        const card = target.closest('.service-card');
        if (!card) return;

        const servicoId = parseInt(card.dataset.id, 10);

        if (target.classList.contains('btn-edit')) {
            window.location.href = window.Relatorios.montarUrl('index.html', { edit: servicoId });
        } else if (target.classList.contains('btn-delete')) {
            const index = servicos.findIndex(s => s.id === servicoId);
            if (index !== -1) excluirServico(index);
        } else if (target.classList.contains('service-card-thumbnail')) {
            const imgSrc = target.src;
            abrirModal(imgSrc);
        }
    }

    // --- MODAL DE IMAGEM ---
    function abrirModal(imgSrc) {
        imageModal.style.display = "block";
        modalImage.src = imgSrc;
    }

    function fecharModal() {
        imageModal.style.display = "none";
    }

    // --- LÓGICA DE PDF ---
    async function exportarParaPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

        const servicosJSON = JSON.stringify(servicos);
        const dataToEmbed = `---SERVICOS_JSON_START---${servicosJSON}---SERVICOS_JSON_END---`;
        doc.setTextColor(255, 255, 255);
        doc.text(dataToEmbed, -100, -100);

        const hoje = new Date();
        const dataFormatada = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const primaryColor = "#4a69bd";
        const secondaryColor = "#788ca3";
        const textColor = "#333333";

        const addHeader = () => {
            doc.setFontSize(10);
            doc.setTextColor(primaryColor);
            doc.text("", 15, 15);

            doc.setFontSize(18);
            doc.setTextColor(textColor);
            doc.text(config.pdfTitulo, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

            doc.setFontSize(6);
            doc.setTextColor(secondaryColor);
            doc.text(`Data de Exportação: ${dataFormatada}`, doc.internal.pageSize.getWidth() - 15, 15, { align: 'right' });

            doc.setDrawColor(primaryColor);
            doc.setLineWidth(0.5);
            doc.line(15, 25, doc.internal.pageSize.getWidth() - 15, 25);
        };

        const addFooter = () => {
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(secondaryColor);
                doc.text(`Página ${i} de ${totalPages}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
            }
        };

        addHeader();
        let y = 35;

        // Filtra e ordena os serviços conforme os controles da tela (prioridade, setor e classificação)
        const servicosParaExportar = obterServicosProcessados();

        // Contexto de layout e paginação
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const contentX = 20;
        const contentWidth = pageWidth - 40;
        const footerLimit = pageHeight - 20;

        // Configuração da grade de imagens: 3 por linha, todas no mesmo tamanho fixo
        const gapImagem = 4;
        const imagensPorLinha = 3;
        const larguraImagem = (contentWidth - (imagensPorLinha - 1) * gapImagem) / imagensPorLinha;
        const alturaImagem = 40;
        const dimensaoImagem = { w: larguraImagem, h: alturaImagem };

        // Recorta cada imagem (corte central) para o formato fixo da grade,
        // garantindo tamanhos iguais no PDF sem distorcer a proporção
        const cacheImagemCortada = new Map();
        const prepararImagemCortada = (src) => {
            if (!src || cacheImagemCortada.has(src)) return Promise.resolve(cacheImagemCortada.get(src) || src);
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = Math.round(dimensaoImagem.w * 10);
                        canvas.height = Math.round(dimensaoImagem.h * 10);
                        const ctx = canvas.getContext('2d');
                        const escala = Math.max(canvas.width / img.width, canvas.height / img.height);
                        const corteW = canvas.width / escala;
                        const corteH = canvas.height / escala;
                        const corteX = (img.width - corteW) / 2;
                        const corteY = (img.height - corteH) / 2;
                        ctx.drawImage(img, corteX, corteY, corteW, corteH, 0, 0, canvas.width, canvas.height);
                        const cortada = canvas.toDataURL('image/jpeg', 0.85);
                        cacheImagemCortada.set(src, cortada);
                        resolve(cortada);
                    } catch (e) {
                        cacheImagemCortada.set(src, src);
                        resolve(src);
                    }
                };
                img.onerror = () => {
                    cacheImagemCortada.set(src, src);
                    resolve(src);
                };
                img.src = src;
            });
        };

        // Pré-recorta todas as imagens para o mesmo formato antes de desenhar
        const todosSrcs = new Set();
        servicosParaExportar.forEach((servico) => {
            (servico.imagens || []).forEach((img) => {
                const src = typeof img === 'string' ? img : img.src;
                if (src) todosSrcs.add(src);
            });
        });
        await Promise.all(Array.from(todosSrcs, prepararImagemCortada));

        // Cria uma nova página com cabeçalho sempre que o conteúdo ultrapassar a margem
        const garantirEspaco = (alturaNecessaria) => {
            if (y + alturaNecessaria > footerLimit) {
                doc.addPage();
                addHeader();
                y = 35;
            }
        };

        // Escreve um campo (rótulo + texto) respeitando quebras de linha e páginas
        const escreverCampo = (rotulo, texto) => {
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(textColor);

            const larguraRotulo = doc.getTextWidth(rotulo) + 2;
            const paragrafos = String(texto || 'Não informado').split('\n');

            paragrafos.forEach((paragrafo, indiceParagrafo) => {
                const larguraDisponivel = indiceParagrafo === 0
                    ? contentWidth - larguraRotulo
                    : contentWidth;

                doc.setFont(undefined, 'normal');
                const linhas = doc.splitTextToSize(paragrafo, larguraDisponivel);
                if (linhas.length === 0) linhas.push('');

                linhas.forEach((linha, indiceLinha) => {
                    garantirEspaco(5);
                    if (indiceParagrafo === 0 && indiceLinha === 0) {
                        doc.setFont(undefined, 'bold');
                        doc.text(rotulo, contentX, y);
                        doc.setFont(undefined, 'normal');
                        doc.text(linha, contentX + larguraRotulo, y);
                    } else {
                        doc.setFont(undefined, 'normal');
                        doc.text(linha, contentX, y);
                    }
                    y += 5;
                });
            });

            y += 2;
        };

        // Desenha a grade de imagens (3 por linha) quebrando linha a linha entre páginas
        const desenharImagens = (imagens) => {
            const captionFontSize = 7;
            const captionLineHeight = 3.2;
            const captionGap = 3;

            garantirEspaco(12);
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(textColor);
            doc.text("Imagens:", contentX, y);
            y += 6;

            let i = 0;
            while (i < imagens.length) {
                const qtdNaLinha = Math.min(imagensPorLinha, imagens.length - i);

                // Pré-calcula as legendas de cada imagem da linha (dimensões já fixas)
                const legendasPorImagem = [];
                let maxLinhasLegenda = 0;
                for (let coluna = 0; coluna < qtdNaLinha; coluna++) {
                    const item = imagens[i + coluna];
                    const currentImg = typeof item === 'string' ? { src: item, caption: '' } : item;

                    const legenda = (currentImg && currentImg.caption) ? String(currentImg.caption) : '';
                    let linhas = [];
                    if (legenda.trim()) {
                        doc.setFontSize(captionFontSize);
                        doc.setFont(undefined, 'normal');
                        linhas = legenda.split('\n').reduce((acc, paragrafo) => {
                            const quebradas = doc.splitTextToSize(paragrafo, larguraImagem);
                            return acc.concat(quebradas.length ? quebradas : ['']);
                        }, []);
                    }
                    legendasPorImagem.push(linhas);
                    maxLinhasLegenda = Math.max(maxLinhasLegenda, linhas.length);
                }

                const blocoLegenda = maxLinhasLegenda > 0
                    ? captionGap + maxLinhasLegenda * captionLineHeight + 3
                    : 0;
                const alturaLinha = dimensaoImagem.h + Math.max(14, blocoLegenda);

                garantirEspaco(alturaLinha);

                for (let coluna = 0; coluna < qtdNaLinha; coluna++, i++) {
                    const imgData = imagens[i];
                    const currentImg = typeof imgData === 'string' ? { src: imgData, caption: '' } : imgData;
                    const colunaX = contentX + coluna * (larguraImagem + gapImagem);

                    doc.setDrawColor(secondaryColor);
                    doc.setLineWidth(0.1);
                    doc.rect(colunaX, y, dimensaoImagem.w, dimensaoImagem.h);

                    try {
                        const srcCortado = cacheImagemCortada.get(currentImg.src) || currentImg.src;
                        doc.addImage(srcCortado, undefined, colunaX, y, dimensaoImagem.w, dimensaoImagem.h);
                    } catch (e) {
                        console.error("Erro ao adicionar imagem ao PDF:", e);
                        doc.setFontSize(8);
                        doc.setTextColor(secondaryColor);
                        doc.text("Erro", colunaX + dimensaoImagem.w / 2, y + dimensaoImagem.h / 2, { align: 'center' });
                    }

                    const linhasLegenda = legendasPorImagem[coluna];
                    if (linhasLegenda && linhasLegenda.length) {
                        doc.setFontSize(captionFontSize);
                        doc.setFont(undefined, 'normal');
                        doc.setTextColor(textColor);
                        let legendaY = y + dimensaoImagem.h + captionGap;
                        linhasLegenda.forEach(linha => {
                            doc.text(linha, colunaX, legendaY);
                            legendaY += captionLineHeight;
                        });
                    }
                }

                y += alturaLinha;
             }
        };

        // Mede a altura de um campo (rótulo + texto), igual ao desenho de escreverCampo
        const medirCampo = (rotulo, texto) => {
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            const larguraRotulo = doc.getTextWidth(rotulo) + 2;
            const paragrafos = String(texto || 'Não informado').split('\n');
            let totalLinhas = 0;
            paragrafos.forEach((paragrafo, indiceParagrafo) => {
                const larguraDisponivel = indiceParagrafo === 0
                    ? contentWidth - larguraRotulo
                    : contentWidth;
                doc.setFont(undefined, 'normal');
                const linhas = doc.splitTextToSize(paragrafo, larguraDisponivel);
                totalLinhas += linhas.length || 1;
            });
            return totalLinhas * 5 + 2;
        };

        // Mede a altura do bloco de imagens, igual ao desenho de desenharImagens
        const medirImagens = (imagens) => {
            const captionFontSize = 7;
            const captionLineHeight = 3.2;
            const captionGap = 3;

            let altura = 6; // rótulo "Imagens:"
            let i = 0;
            while (i < imagens.length) {
                const qtdNaLinha = Math.min(imagensPorLinha, imagens.length - i);
                let maxLinhasLegenda = 0;
                for (let coluna = 0; coluna < qtdNaLinha; coluna++) {
                    const item = imagens[i + coluna];
                    const currentImg = typeof item === 'string' ? { src: item, caption: '' } : item;

                    const legenda = (currentImg && currentImg.caption) ? String(currentImg.caption) : '';
                    if (legenda.trim()) {
                        doc.setFontSize(captionFontSize);
                        doc.setFont(undefined, 'normal');
                        const linhas = legenda.split('\n').reduce((acc, paragrafo) => {
                            const quebradas = doc.splitTextToSize(paragrafo, larguraImagem);
                            return acc.concat(quebradas.length ? quebradas : ['']);
                        }, []);
                        maxLinhasLegenda = Math.max(maxLinhasLegenda, linhas.length);
                    }
                }
                const blocoLegenda = maxLinhasLegenda > 0
                    ? captionGap + maxLinhasLegenda * captionLineHeight + 3
                    : 0;
                altura += dimensaoImagem.h + Math.max(14, blocoLegenda);
                i += qtdNaLinha;
            }
            return altura;
        };

        // Mede a altura total de um serviço para decidir a quebra de página
        const medirServico = (servico) => {
            let altura = 20; // cabeçalho (assunto + divisor) + linha de prioridade
            if (servico.setor && servico.setor.trim()) {
                altura += 8; // linha do setor
            }
            altura += medirCampo("Descrição:", servico.descricao);
            altura += medirCampo("Conclusão:", servico.conclusao);
            if (servico.imagens && servico.imagens.length > 0) {
                altura += medirImagens(servico.imagens);
            }
            altura += 8; // espaçamento entre serviços
            return altura;
        };

        // Itera sobre a lista filtrada e ordenada para criar o PDF
        servicosParaExportar.forEach((servico) => {
            // Define as cores de prioridade
            const priorityColors = {
                urgente: '#e74c3c',
                media: '#f39c12',
                baixa: '#3498db',
                default: '#cccccc'
            };
            const cardColor = priorityColors[servico.prioridade] || priorityColors.default;

            // Se o serviço não couber inteiro no espaço restante, inicia uma nova página
            const alturaServico = medirServico(servico);
            if (y + alturaServico > footerLimit && y > 35) {
                doc.addPage();
                addHeader();
                y = 35;
            }

            // Cabeçalho do serviço
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(primaryColor);
            doc.text(servico.assunto, contentX, y);

            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(secondaryColor);
            doc.text(`Registrado em: ${servico.data}`, pageWidth - contentX, y, { align: 'right' });

            y += 6;
            doc.setDrawColor("#e3e3e3");
            doc.setLineWidth(0.1);
            doc.line(contentX, y, pageWidth - contentX, y);
            y += 6;

            // --- Adiciona a Prioridade com fundo colorido ---
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(textColor);
            doc.text("Prioridade:", contentX, y);

            const prioridadeTexto = servico.prioridade ? servico.prioridade.charAt(0).toUpperCase() + servico.prioridade.slice(1) : 'Não definida';
            const labelWidth = doc.getTextWidth("Prioridade:");
            const badgeX = contentX + labelWidth + 2;
            const badgeWidth = doc.getTextWidth(prioridadeTexto) + 4;
            const badgeHeight = 5;

            // Desenha o fundo da etiqueta
            doc.setFillColor(cardColor);
            doc.roundedRect(badgeX, y - (badgeHeight / 2) - 1, badgeWidth, badgeHeight, 2, 2, 'F');

            // Escreve o texto da prioridade
            doc.setFont(undefined, 'bold');
            doc.setTextColor("#ffffff"); // Texto branco
            doc.text(prioridadeTexto, badgeX + 2, y);

            y += 8; // Espaçamento após a prioridade
            // --- Fim da seção de Prioridade ---

            if (servico.setor && servico.setor.trim()) {
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(textColor);
                doc.text("Setor:", contentX, y);
                doc.setFont(undefined, 'normal');
                doc.text(servico.setor, contentX + doc.getTextWidth("Setor:") + 2, y);
                y += 8;
            }

            escreverCampo("Descrição:", servico.descricao);
            escreverCampo("Conclusão:", servico.conclusao);

            if (servico.imagens && servico.imagens.length > 0) {
                desenharImagens(servico.imagens);
            }

            y += 8; // Espaçamento entre serviços
        });

        addFooter();

        try {
            const pdfOutput = doc.output('blob');
            const pdfName = `${config.pdfArquivo}_${dataFormatada.replace(/\//g, '-')}.pdf`;
            const link = document.createElement('a');
            link.href = URL.createObjectURL(pdfOutput);
            link.download = pdfName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Erro ao gerar Blob, usando doc.save() como fallback", e);
            doc.save(`${config.pdfArquivo}_${dataFormatada.replace(/\//g, '-')}.pdf`);
        }
    }

    async function importarDePDF(event) {
        const arquivos = Array.from(event.target.files || []);
        if (arquivos.length === 0) return;

        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

        const lerArquivo = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });

        let novosServicos = [];
        const arquivosComErro = [];

        for (const file of arquivos) {
            try {
                const buffer = await lerArquivo(file);
                const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
                let fullText = '';

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map(item => item.str).join(' ');
                }

                const jsonMatch = fullText.match(/---SERVICOS_JSON_START---(.*?)---SERVICOS_JSON_END---/);
                if (jsonMatch && jsonMatch[1]) {
                    const extraidos = JSON.parse(jsonMatch[1]);
                    if (Array.isArray(extraidos)) {
                        novosServicos = novosServicos.concat(extraidos);
                    }
                } else {
                    arquivosComErro.push(file.name);
                }
            } catch (error) {
                console.error(`Erro ao importar PDF "${file.name}":`, error);
                arquivosComErro.push(file.name);
            }
        }

        event.target.value = '';

        if (novosServicos.length > 0) {
            servicos = [...servicos, ...novosServicos];
            salvarServicos();
            renderizarServicos();
            let mensagem = `${novosServicos.length} serviço(s) importado(s) com sucesso de ${arquivos.length} arquivo(s)!`;
            if (arquivosComErro.length > 0) {
                mensagem += `\n\nNão foi possível ler: ${arquivosComErro.join(', ')}`;
            }
            alert(mensagem);
        } else {
            alert('Nenhum serviço foi encontrado nos PDFs selecionados. Os arquivos podem ser de versões antigas ou não conter um relatório válido.');
        }
    }

    // --- INICIA A APLICAÇÃO ---
    init();
});
