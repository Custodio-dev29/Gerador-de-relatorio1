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

    // --- ESTADO DA APLICAÇÃO ---
    const STORAGE_KEY = 'relatorio_diario';
    let servicos = carregarServicos();

    // --- FUNÇÕES DE INICIALIZAÇÃO ---
    function init() {
        configurarEventListeners();
        renderizarServicos();
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
    }

    // --- GERENCIAMENTO DE ESTADO (LocalStorage) ---
    function carregarServicos() {
        const servicosSalvos = localStorage.getItem(STORAGE_KEY);
        return servicosSalvos ? JSON.parse(servicosSalvos) : [];
    }

    function salvarServicos() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(servicos));
    }

    // --- LÓGICA DE SERVIÇOS (CRUD) ---
    function editarServico(index) {
        const servicoId = servicos[index].id;
        // Redireciona para a página principal, passando o ID do serviço como parâmetro
        window.location.href = `index.html?edit=${servicoId}`;
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
            salvarServicos(); // Atualiza o localStorage com o array vazio
            renderizarServicos(); // Atualiza a interface
        }
    }

    function renderizarServicos() {
        const filterValue = filterPriorityInput.value;

        let servicosFiltrados = servicos.filter(servico => {
            if (filterValue === 'todos') return true;
            return servico.prioridade === filterValue;
        });

        // Classifica os serviços por prioridade (Urgente > Média > Baixa)
        const priorityOrder = { 'urgente': 1, 'media': 2, 'baixa': 3 };
        servicosFiltrados.sort((a, b) => {
            const prioridadeA = priorityOrder[a.prioridade] || 4; // Usa 4 para prioridades não definidas
            const prioridadeB = priorityOrder[b.prioridade] || 4;

            if (prioridadeA !== prioridadeB) {
                return prioridadeA - prioridadeB;
            }
            // Se a prioridade for a mesma, classifica pelo mais recente (ID maior)
            return b.id - a.id;
        });

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
                <p><strong>Assunto:</strong> ${s.assunto}</p>
                <p><strong>Prioridade:</strong> 
                    <span class="priority-text">${s.prioridade ? s.prioridade.charAt(0).toUpperCase() + s.prioridade.slice(1) : 'Não definida'}</span>
                </p>
                <p><strong>Descrição:</strong> ${s.descricao}</p>
                <p><strong>Conclusão:</strong> ${s.conclusao}</p>
                ${s.imagens.length > 0 ? `
                    <div class="service-card-images">
                        ${s.imagens.map(imgData => `
                            <div class="thumbnail-container">
                                <img src="${imgData.src || imgData}" alt="Miniatura" class="service-card-thumbnail">
                                ${imgData.caption ? `<p class="thumbnail-caption">${imgData.caption}</p>` : ''}
                            </div>
                        `).join('')}
                    </div>` : ''}
                <div class="service-date">Registrado em: ${s.data}</div>
                <div class="service-card-actions">
                    <button class="btn-edit" data-id="${s.id}">✏️ Editar</button>
                    <button class="btn-delete" data-id="${s.id}">🗑️ Excluir</button>
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
            window.location.href = `index.html?edit=${servicoId}`;
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
    function exportarParaPDF() {
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
            doc.text("Relatório diário", doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

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

        // Pega o valor do filtro atual
        const filterValue = filterPriorityInput.value;

        // Filtra os serviços conforme o filtro selecionado
        let servicosParaExportar = servicos.filter(servico => {
            if (filterValue === 'todos') return true;
            return servico.prioridade === filterValue;
        });

        // Ordena os serviços filtrados pela mesma regra da tela
        const priorityOrder = { 'urgente': 1, 'media': 2, 'baixa': 3 };
        servicosParaExportar.sort((a, b) => {
            const prioridadeA = priorityOrder[a.prioridade] || 4;
            const prioridadeB = priorityOrder[b.prioridade] || 4;
            if (prioridadeA !== prioridadeB) {
                return prioridadeA - prioridadeB;
            }
            return b.id - a.id;
        });

        // Contexto de layout e paginação
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const contentX = 20;
        const contentWidth = pageWidth - 40;
        const footerLimit = pageHeight - 20;

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

        // Desenha a grade de imagens quebrando linha a linha entre páginas
        const desenharImagens = (imagens) => {
            const imgWidth = 40;
            const imgHeight = 40;
            const gap = 4;
            const imagesPerRow = 4;
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
                const qtdNaLinha = Math.min(imagesPerRow, imagens.length - i);

                // Pré-calcula as linhas de legenda de cada imagem da linha
                const legendasPorImagem = [];
                let maxLinhasLegenda = 0;
                for (let coluna = 0; coluna < qtdNaLinha; coluna++) {
                    const item = imagens[i + coluna];
                    const legenda = (item && typeof item === 'object' && item.caption) ? String(item.caption) : '';
                    let linhas = [];
                    if (legenda.trim()) {
                        doc.setFontSize(captionFontSize);
                        doc.setFont(undefined, 'normal');
                        linhas = legenda.split('\n').reduce((acc, paragrafo) => {
                            const quebradas = doc.splitTextToSize(paragrafo, imgWidth);
                            return acc.concat(quebradas.length ? quebradas : ['']);
                        }, []);
                    }
                    legendasPorImagem.push(linhas);
                    maxLinhasLegenda = Math.max(maxLinhasLegenda, linhas.length);
                }

                const blocoLegenda = maxLinhasLegenda > 0
                    ? captionGap + maxLinhasLegenda * captionLineHeight + 3
                    : 0;
                const alturaLinha = imgHeight + Math.max(14, blocoLegenda);

                garantirEspaco(alturaLinha);

                for (let coluna = 0; coluna < qtdNaLinha; coluna++, i++) {
                    const imgData = imagens[i];
                    const currentImg = typeof imgData === 'string' ? { src: imgData, caption: '' } : imgData;
                    const currentX = contentX + coluna * (imgWidth + gap);

                    doc.setDrawColor(secondaryColor);
                    doc.setLineWidth(0.1);
                    doc.rect(currentX, y, imgWidth, imgHeight);

                    try {
                        doc.addImage(currentImg.src, undefined, currentX, y, imgWidth, imgHeight);
                    } catch (e) {
                        console.error("Erro ao adicionar imagem ao PDF:", e);
                        doc.setFontSize(8);
                        doc.setTextColor(secondaryColor);
                        doc.text("Erro", currentX + imgWidth / 2, y + imgHeight / 2, { align: 'center' });
                    }

                    const linhasLegenda = legendasPorImagem[coluna];
                    if (linhasLegenda && linhasLegenda.length) {
                        doc.setFontSize(captionFontSize);
                        doc.setFont(undefined, 'normal');
                        doc.setTextColor(secondaryColor);
                        let legendaY = y + imgHeight + captionGap;
                        linhasLegenda.forEach(linha => {
                            doc.text(linha, currentX, legendaY);
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
            const imgWidth = 40;
            const imgHeight = 40;
            const imagesPerRow = 4;
            const captionFontSize = 7;
            const captionLineHeight = 3.2;
            const captionGap = 3;

            let altura = 6; // rótulo "Imagens:"
            let i = 0;
            while (i < imagens.length) {
                const qtdNaLinha = Math.min(imagesPerRow, imagens.length - i);
                let maxLinhasLegenda = 0;
                for (let coluna = 0; coluna < qtdNaLinha; coluna++) {
                    const item = imagens[i + coluna];
                    const legenda = (item && typeof item === 'object' && item.caption) ? String(item.caption) : '';
                    if (legenda.trim()) {
                        doc.setFontSize(captionFontSize);
                        doc.setFont(undefined, 'normal');
                        const linhas = legenda.split('\n').reduce((acc, paragrafo) => {
                            const quebradas = doc.splitTextToSize(paragrafo, imgWidth);
                            return acc.concat(quebradas.length ? quebradas : ['']);
                        }, []);
                        maxLinhasLegenda = Math.max(maxLinhasLegenda, linhas.length);
                    }
                }
                const blocoLegenda = maxLinhasLegenda > 0
                    ? captionGap + maxLinhasLegenda * captionLineHeight + 3
                    : 0;
                altura += imgHeight + Math.max(14, blocoLegenda);
                i += qtdNaLinha;
            }
            return altura;
        };

        // Mede a altura total de um serviço para decidir a quebra de página
        const medirServico = (servico) => {
            let altura = 20; // cabeçalho (assunto + divisor) + linha de prioridade
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
            const pdfName = `Relatorio_Diario_${dataFormatada.replace(/\//g, '-')}.pdf`;
            const link = document.createElement('a');
            link.href = URL.createObjectURL(pdfOutput);
            link.download = pdfName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Erro ao gerar Blob, usando doc.save() como fallback", e);
            doc.save(`Relatorio_Diario_${dataFormatada.replace(/\//g, '-')}.pdf`);
        }
    }

    async function importarDePDF(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const pdfjsLib = window['pdfjs-dist/build/pdf'];
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

                const loadingTask = pdfjsLib.getDocument({ data: e.target.result });
                const pdf = await loadingTask.promise;
                let fullText = '';

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map(item => item.str).join(' ');
                }

                let novosServicos = [];
                const jsonMatch = fullText.match(/---SERVICOS_JSON_START---(.*?)---SERVICOS_JSON_END---/);

                if (jsonMatch && jsonMatch[1]) {
                    novosServicos = JSON.parse(jsonMatch[1]);
                } else {
                    alert('Não foi possível encontrar dados de serviço importáveis neste PDF. O arquivo pode ser de uma versão antiga ou não conter um relatório válido.');
                    return;
                }

                if (novosServicos.length > 0) {
                    servicos = [...servicos, ...novosServicos];
                    salvarServicos();
                    renderizarServicos();
                    alert(`${novosServicos.length} serviço(s) importado(s) com sucesso!`);
                } else {
                    alert('Nenhum serviço foi encontrado nos dados do PDF.');
                }

            } catch (error) {
                console.error('Erro ao importar PDF:', error);
                alert('Falha ao importar o arquivo PDF. O arquivo pode estar corrompido ou em um formato inesperado.');
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // --- INICIA A APLICAÇÃO ---
    init();
});