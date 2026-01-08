const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'database.sqlite');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

async function initDb() {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT,
            processo TEXT,
            objeto TEXT,
            justificativa TEXT,
            tipo TEXT,
            modalidade TEXT,
            contrato TEXT,
            prioridade TEXT,
            data_previsao TEXT,
            valor REAL,
            unidade TEXT
        )
    `);

    const countResult = await db.get('SELECT COUNT(*) as count FROM contracts');
    if (countResult.count === 0) {
        const jsonPath = path.join(__dirname, 'contracts.json');
        if (fs.existsSync(jsonPath)) {
            console.log('Importing data from contracts.json...');
            const contracts = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

            for (const item of contracts) {
                await db.run(`
                    INSERT INTO contracts (codigo, processo, objeto, justificativa, tipo, modalidade, contrato, prioridade, data_previsao, valor, unidade)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    item.id,
                    item.processo,
                    item.objeto,
                    item.justificativa,
                    item.tipo,
                    item.modalidade,
                    item.contrato,
                    item.prioridade,
                    item.data,
                    item.valor,
                    item.unidade
                ]);
            }
            console.log(`Imported ${contracts.length} items.`);
        }
    }

    return db;
}

initDb().then(db => {
    app.get('/api/contracts', async (req, res) => {
        try {
            const rows = await db.all('SELECT * FROM contracts ORDER BY CAST(codigo AS INTEGER) ASC');
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/stats', async (req, res) => {
        try {
            const totalValue = (await db.get('SELECT SUM(valor) as total FROM contracts')).total || 0;
            const totalItems = (await db.get('SELECT COUNT(*) as count FROM contracts')).count;
            const highPriority = (await db.get("SELECT COUNT(*) as count FROM contracts WHERE prioridade IN ('ALTA', 'ALTÍSSIMA')")).count;

            res.json({
                totalValue,
                totalItems,
                highPriority
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.listen(port, '0.0.0.0', () => {
        console.log(`Server running at http://0.0.0.0:${port}`);
    });
});
