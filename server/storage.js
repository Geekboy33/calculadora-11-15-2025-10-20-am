import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const apiKeysFile = path.join(dataDir, 'apiKeys.json');
const porReportsFile = path.join(dataDir, 'porReports.json');

// helpers

function readJson(file) {
	try {
		return JSON.parse(fs.readFileSync(file, 'utf-8'));
	} catch {
		return [];
	}
}

function writeJson(file, data) {
	fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function ensureDataFiles() {
	if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
	if (!fs.existsSync(apiKeysFile)) fs.writeFileSync(apiKeysFile, JSON.stringify([]));
	if (!fs.existsSync(porReportsFile)) fs.writeFileSync(porReportsFile, JSON.stringify([]));
}

export function getApiKeys() {
	ensureDataFiles();
	return readJson(apiKeysFile);
}
export function saveApiKeys(keys) {
	writeJson(apiKeysFile, keys);
}
export function getPorReports() {
	ensureDataFiles();
	return readJson(porReportsFile);
}
export function savePorReports(reports) {
	writeJson(porReportsFile, reports);
}


