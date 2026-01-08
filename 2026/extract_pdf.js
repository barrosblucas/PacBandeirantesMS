const fs = require('fs');
const { PDFParse } = require('/tmp/node_stuff/node_modules/pdf-parse');

async function run() {
    let dataBuffer = fs.readFileSync('/home/thanos/PacBandeirantesMS/2026/PAC-CRONOGRAMA.pdf');
    const pdf = new PDFParse(new Uint8Array(dataBuffer));

    try {
        await pdf.load();
        const totalPages = pdf.doc.numPages;
        let allText = '';

        for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.doc.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            allText += ' ' + pageText;
        }

        // Clean headers
        const headerPattern = /PREFEITURA MUNICIPAL DE BANDEIRANTES\/MS\s+PLANO ANUAL DE CONTRATAÇÕES - 2026\s+N\s*º do Processo de\s+Referência \(se\s+houver\)\s+ID\s+Objeto\s+Justificativa\s+Tipo\s+Modalidade\s+Contrato\s+Grau de Complexidade\s+Previsão de Início do Processo\s+Valor\s+Unidade/gi;
        const cleanedText = allText.replace(headerPattern, ' [ITEM_SEP] ');

        // Revised Regex: Value (match[9]) is now optional
        const regex = /(\d{3}\/\d{4})?\s*(\d{1,3})\s+(.+?)\s+(Serviço|Permanente|Obras|Consumo|Material|Distribuição\s+Gratuita|Aquisição\s+de\s+Materiais)\s+(Pregão|Inexigibilidade|Dispensa\s+de\s+Licitação|Dispensa|Concorrência|Leilão|Chamada\s+Pública|SRP)\s+(SRP|Contrato|Ata|Adesão)\s+(ALTÍSSIMA|ALTA|MÉDIA|BAIXA)\s+(\d{2}\/\d{2}\/\d{4})\s+(?:(R\$\s+[\d.,]+)\s+)?([A-Z]{3,})/g;

        let items = [];
        let match;
        while ((match = regex.exec(cleanedText)) !== null) {
            let objeto_completo = match[3];

            const splitPatterns = [
                'A contratação referente', 'A medida visa', 'Necessária para', 'Visa assegurar',
                'Destina-se ao', 'As intervenções propostas', 'Visa dotar', 'O objeto atende',
                'A presente contratação', 'Sua realização garante', 'A medida mostra-se',
                'Justifica-se para', 'Visa suprir', 'Trata-se de', 'A aquisição em tela',
                'O presente pedido', 'Tal medida'
            ];

            let splitIndex = -1;
            for (const pattern of splitPatterns) {
                const idx = objeto_completo.indexOf(pattern);
                if (idx !== -1 && (splitIndex === -1 || idx < splitIndex)) {
                    splitIndex = idx;
                }
            }

            let objeto = objeto_completo;
            let justificativa = '-';
            if (splitIndex !== -1) {
                objeto = objeto_completo.substring(0, splitIndex).trim();
                justificativa = objeto_completo.substring(splitIndex).trim();
            }

            const valor_raw = match[9] || 'R$ 0,00';
            const valor = parseFloat(valor_raw.replace('R$ ', '').replace(/\./g, '').replace(',', '.'));

            items.push({
                processo: match[1] || '-',
                id: match[2],
                objeto: objeto,
                justificativa: justificativa,
                tipo: match[4],
                modalidade: match[5],
                contrato: match[6],
                prioridade: match[7],
                data: match[8],
                valor_raw: valor_raw,
                valor: valor,
                unidade: match[10]
            });
        }

        fs.writeFileSync('contracts.json', JSON.stringify(items, null, 2));
        console.log(`Successfully extracted ${items.length} items.`);

        // Verify any missing IDs
        const ids = items.map(it => parseInt(it.id));
        const maxId = Math.max(...ids);
        const missing = [];
        for (let i = 1; i <= maxId; i++) {
            if (!ids.includes(i)) missing.push(i);
        }
        if (missing.length > 0) console.log('Missing IDs after parse:', missing);

    } catch (e) {
        console.error('Error during parsing:', e);
    }
}

run();
