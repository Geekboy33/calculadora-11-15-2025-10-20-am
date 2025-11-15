#!/usr/bin/env python3
"""
Digital Commercial Bank Ltd Audit Bank Panel - M-Classification System
Detects and classifies financial assets from Digital Commercial Bank Ltd files into M0-M4 categories
Compliant with ISO 27001 / AML / FATF standards
"""

import os
import re
import json
import csv
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import uuid

# =====================================================
# CONFIGURACIÓN
# =====================================================

# Ruta raíz para escaneo (configurable)
DATA_PATH = os.getenv('Digital Commercial Bank Ltd_DATA_PATH', './data/Digital Commercial Bank Ltd')

# Tasas de cambio (actualizar según necesidad)
EXCHANGE_RATES = {
    'USD': 1.0,
    'EUR': 1.05,
    'GBP': 1.21,
    'CHF': 1.09,
    'BRL': 0.19,
    'AED': 0.27,
    'CAD': 0.74,
    'AUD': 0.65,
    'JPY': 0.0067,
    'CNY': 0.14,
    'INR': 0.012,
    'MXN': 0.05,
}

# Umbral para depósitos institucionales (M3)
INSTITUTIONAL_THRESHOLD = 1_000_000

# Lista blanca de bancos conocidos
WHITELIST_BANKS = [
    'Banco do Brasil', 'Emirates NBD', 'First National Bank', 'UBS', 
    'Barclays', 'HSBC', 'JPMorgan', 'Citibank', 'Wells Fargo',
    'Bank of America', 'Goldman Sachs', 'Morgan Stanley', 'FAB',
    'Credit Suisse', 'Deutsche Bank', 'BNP Paribas', 'Santander',
]

# Palabras clave para clasificación M0-M4
M0_KEYWORDS = ['cash', 'efectivo', 'billetes', 'monedas', 'physical cash', 'caja']
M1_KEYWORDS = ['checking', 'current account', 'cuenta corriente', 'demand deposit', 'vista']
M2_KEYWORDS = ['savings', 'ahorro', 'time deposit', 'plazo fijo', 'certificate of deposit', 'cd']
M3_KEYWORDS = ['large deposit', 'institutional', 'institucional', 'wholesale', 'corporate']
M4_KEYWORDS = ['repo', 'repurchase', 'mtn', 'medium term note', 'skr', 'safe keeping receipt', 
               'commercial paper', 'money market', 'treasury', 'bond', 'instrument']

# =====================================================
# CLASES Y ESTRUCTURAS DE DATOS
# =====================================================

class AuditFinding:
    """Representa un hallazgo de auditoría"""
    def __init__(self, file_path: str, bank: str, account: str, amount: float, 
                 currency: str, classification: str, evidence: str, confidence: int):
        self.id = str(uuid.uuid4())
        self.file_path = file_path
        self.file_hash = self._hash_file(file_path) if os.path.exists(file_path) else "N/A"
        self.file_mod_date = datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat() if os.path.exists(file_path) else "N/A"
        self.bank = bank
        self.account = self._mask_account(account)
        self.amount = amount
        self.currency = currency
        self.classification = classification
        self.evidence = evidence[:200]  # Truncar evidencia
        self.confidence = confidence
        self.timestamp = datetime.now().isoformat()
    
    @staticmethod
    def _hash_file(file_path: str) -> str:
        """Genera hash SHA-256 del archivo"""
        try:
            sha256_hash = hashlib.sha256()
            with open(file_path, "rb") as f:
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            return sha256_hash.hexdigest()
        except:
            return "error_hashing"
    
    @staticmethod
    def _mask_account(account: str) -> str:
        """Enmascara número de cuenta para seguridad"""
        if len(account) <= 4:
            return "****"
        return "*" * (len(account) - 4) + account[-4:]
    
    def to_dict(self) -> Dict:
        """Convierte a diccionario para JSON"""
        return {
            "id_registro": self.id,
            "archivo": {
                "ruta": self.file_path,
                "hash_sha256": self.file_hash,
                "fecha_mod": self.file_mod_date
            },
            "banco_detectado": self.bank,
            "numero_cuenta_mask": self.account,
            "money": {
                "amount": self.amount,
                "currency": self.currency
            },
            "classification": self.classification,
            "evidencia_fragmento": self.evidence,
            "score_confianza": self.confidence,
            "timestamp_detectado": self.timestamp
        }

# =====================================================
# FUNCIONES DE EXTRACCIÓN
# =====================================================

def extract_text_from_file(file_path: str) -> str:
    """
    Extrae texto de archivo (soporta TXT, LOG, JSON, CSV básico)
    Para PDF, DOCX, XLSX se necesitarían librerías adicionales (PyPDF2, python-docx, openpyxl)
    """
    try:
        # Archivos de texto plano
        if file_path.lower().endswith(('.txt', '.log', '.json', '.csv')):
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        
        # Para otros formatos, retornar placeholder
        # En producción, aquí iría OCR y parsers especializados
        return f"[Archivo binario {os.path.basename(file_path)} - requiere parser especializado]"
    
    except Exception as e:
        return f"[Error leyendo archivo: {e}]"

# =====================================================
# FUNCIONES DE DETECCIÓN
# =====================================================

def detect_account_numbers(text: str) -> List[str]:
    """Detecta números de cuenta (8-22 dígitos consecutivos)"""
    pattern = r'\b\d{8,22}\b'
    matches = re.findall(pattern, text)
    return list(set(matches))  # Eliminar duplicados

def detect_iban(text: str) -> List[str]:
    """Detecta códigos IBAN"""
    pattern = r'\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b'
    matches = re.findall(pattern, text)
    return list(set(matches))

def detect_swift_bic(text: str) -> List[str]:
    """Detecta códigos SWIFT/BIC"""
    pattern = r'\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?\b'
    matches = re.findall(pattern, text)
    return [m[0] if isinstance(m, tuple) else m for m in set(matches)]

def detect_amounts(text: str) -> List[Tuple[float, str]]:
    """
    Detecta montos monetarios con moneda
    Retorna lista de tuplas (monto, moneda)
    """
    results = []
    
    # Patrones para diferentes formatos monetarios
    patterns = [
        # USD $1,234,567.89
        (r'\$\s*([0-9,]+\.?\d*)', 'USD'),
        # EUR €1.234.567,89 o €1,234,567.89
        (r'€\s*([0-9,.]+)', 'EUR'),
        # GBP £1,234,567.89
        (r'£\s*([0-9,.]+)', 'GBP'),
        # BRL R$ 1.234.567,89
        (r'R\$\s*([0-9,.]+)', 'BRL'),
        # AED AED 1,234,567.89
        (r'AED\s*([0-9,.]+)', 'AED'),
        # Generic: USD 1,234,567.89
        (r'(USD|EUR|GBP|CHF|BRL|AED|CAD|AUD|JPY|CNY|INR|MXN)\s*([0-9,.]+)', None),
    ]
    
    for pattern, default_currency in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple) and len(match) == 2:
                currency, amount_str = match
                currency = currency.upper()
            else:
                amount_str = match if isinstance(match, str) else match[0]
                currency = default_currency
            
            # Limpiar y convertir a float
            amount_str = amount_str.replace(',', '').replace('.', '', amount_str.count('.') - 1)
            try:
                amount = float(amount_str)
                if amount > 1000:  # Filtrar montos pequeños
                    results.append((amount, currency))
            except ValueError:
                continue
    
    return results

def detect_bank(text: str) -> Optional[str]:
    """Detecta nombre del banco en el texto"""
    text_lower = text.lower()
    for bank in WHITELIST_BANKS:
        if bank.lower() in text_lower:
            return bank
    
    # Buscar patrón genérico "Bank of X" o "X Bank"
    bank_pattern = r'\b([A-Z][a-z]+ Bank|Bank of [A-Z][a-z]+)\b'
    match = re.search(bank_pattern, text)
    if match:
        return match.group(1)
    
    return "Unknown Bank"

def classify_money_category(text: str, amount: float, currency: str) -> Tuple[str, int]:
    """
    Clasifica monto en categoría M0-M4
    Retorna (clasificación, score de confianza)
    """
    text_lower = text.lower()
    
    # M4 - Instrumentos financieros (prioridad alta)
    if any(kw in text_lower for kw in M4_KEYWORDS):
        return ('M4', 95)
    
    # M0 - Efectivo físico
    if any(kw in text_lower for kw in M0_KEYWORDS):
        return ('M0', 92)
    
    # M3 - Depósitos institucionales (> umbral)
    amount_usd = amount * EXCHANGE_RATES.get(currency, 1.0)
    if amount_usd > INSTITUTIONAL_THRESHOLD:
        if any(kw in text_lower for kw in M3_KEYWORDS):
            return ('M3', 93)
        # Si es un monto grande sin keywords específicos, asumir M3
        return ('M3', 85)
    
    # M2 - Ahorro y depósitos a plazo
    if any(kw in text_lower for kw in M2_KEYWORDS):
        return ('M2', 90)
    
    # M1 - Depósitos a la vista (default para cuentas bancarias)
    if any(kw in text_lower for kw in M1_KEYWORDS):
        return ('M1', 91)
    
    # Default: M1 con confianza baja
    return ('M1', 70)

# =====================================================
# FUNCIÓN PRINCIPAL DE ESCANEO
# =====================================================

def scan_directory(root_path: str) -> List[AuditFinding]:
    """
    Escanea directorio recursivamente buscando archivos financieros
    """
    findings = []
    
    # Extensiones de archivo a escanear
    valid_extensions = ['.pdf', '.docx', '.xlsx', '.csv', '.json', '.log', '.txt']
    
    print(f"[Audit] Iniciando escaneo en: {root_path}")
    
    for root, dirs, files in os.walk(root_path):
        for file in files:
            if not any(file.lower().endswith(ext) for ext in valid_extensions):
                continue
            
            file_path = os.path.join(root, file)
            print(f"[Audit] Analizando: {file_path}")
            
            # Extraer texto
            text = extract_text_from_file(file_path)
            
            # Detectar entidades
            accounts = detect_account_numbers(text)
            ibans = detect_iban(text)
            amounts = detect_amounts(text)
            bank = detect_bank(text)
            
            # Crear hallazgos por cada monto detectado
            for amount, currency in amounts:
                account = accounts[0] if accounts else (ibans[0] if ibans else "UNKNOWN")
                
                # Clasificar
                classification, confidence = classify_money_category(text, amount, currency)
                
                # Extraer evidencia (contexto alrededor del monto)
                evidence = text[:300] if len(text) > 300 else text
                
                finding = AuditFinding(
                    file_path=file_path,
                    bank=bank,
                    account=account,
                    amount=amount,
                    currency=currency,
                    classification=classification,
                    evidence=evidence,
                    confidence=confidence
                )
                
                findings.append(finding)
    
    print(f"[Audit] Escaneo completo. Total hallazgos: {len(findings)}")
    return findings

# =====================================================
# FUNCIONES DE AGREGACIÓN Y EXPORTACIÓN
# =====================================================

def aggregate_by_currency(findings: List[AuditFinding]) -> List[Dict]:
    """Agrega hallazgos por moneda y clasificación"""
    aggregated = {}
    
    for finding in findings:
        currency = finding.currency
        if currency not in aggregated:
            aggregated[currency] = {
                'currency': currency,
                'M0': 0, 'M1': 0, 'M2': 0, 'M3': 0, 'M4': 0,
                'equiv_usd': 0
            }
        
        # Sumar al clasificador correspondiente
        aggregated[currency][finding.classification] += finding.amount
    
    # Calcular equivalentes USD
    for currency, data in aggregated.items():
        rate = EXCHANGE_RATES.get(currency, 1.0)
        total = sum([data['M0'], data['M1'], data['M2'], data['M3'], data['M4']])
        data['equiv_usd'] = round(total * rate, 2)
    
    return list(aggregated.values())

def export_json(findings: List[AuditFinding], output_path: str):
    """Exporta resultados a JSON"""
    aggregated = aggregate_by_currency(findings)
    
    output = {
        "resumen": {
            "total_hallazgos": len(findings),
            "fecha": datetime.now().isoformat()
        },
        "agregados": aggregated,
        "hallazgos": [f.to_dict() for f in findings]
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"[Export] JSON guardado en: {output_path}")

def export_csv(findings: List[AuditFinding], output_path: str):
    """Exporta hallazgos a CSV"""
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'ID', 'Archivo', 'Banco', 'Cuenta', 'Monto', 'Moneda',
            'Clasificación', 'Confianza', 'Fecha Detección'
        ])
        
        for finding in findings:
            writer.writerow([
                finding.id,
                finding.file_path,
                finding.bank,
                finding.account,
                finding.amount,
                finding.currency,
                finding.classification,
                f"{finding.confidence}%",
                finding.timestamp
            ])
    
    print(f"[Export] CSV guardado en: {output_path}")

# =====================================================
# MAIN
# =====================================================

def main():
    """Función principal"""
    print("=" * 60)
    print("Digital Commercial Bank Ltd AUDIT BANK PANEL - M-Classification System")
    print("=" * 60)
    print()
    
    # Verificar ruta de datos
    if not os.path.exists(DATA_PATH):
        print(f"[Error] Ruta no encontrada: {DATA_PATH}")
        print("[Info] Creando ruta de ejemplo...")
        os.makedirs(DATA_PATH, exist_ok=True)
        
        # Crear archivo de muestra
        sample_file = os.path.join(DATA_PATH, "sample_statement.txt")
        with open(sample_file, 'w') as f:
            f.write("""
            Bank Statement - Emirates NBD
            Account: 1234567890123456
            Current Account Balance: AED 1,500,000.00
            Date: December 15, 2024
            
            Wire Transfer Record
            From: Checking Account 00004432
            Bank: Banco do Brasil
            Amount: R$ 3,200,000.00
            Status: Completed
            
            Certificate of Deposit
            Institution: UBS
            Account Number: 9876543210987654
            Principal Amount: USD 5,000,000.00
            Term: 24 months
            Classification: Large Time Deposit
            
            Repurchase Agreement (REPO)
            Counterparty: Barclays
            Account: 5567788990011223
            Principal: USD 8,000,000.00
            Term: 90 days
            Type: Financial Instrument
            """)
        print(f"[Info] Archivo de muestra creado en: {sample_file}")
    
    # Escanear
    findings = scan_directory(DATA_PATH)
    
    if not findings:
        print("[Warning] No se encontraron hallazgos")
        return
    
    # Exportar resultados
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    json_output = f"audit_Digital Commercial Bank Ltd_output_{timestamp}.json"
    csv_output = f"audit_Digital Commercial Bank Ltd_aggregated_{timestamp}.csv"
    
    export_json(findings, json_output)
    export_csv(findings, csv_output)
    
    print()
    print("=" * 60)
    print("RESUMEN EJECUTIVO")
    print("=" * 60)
    print(f"Total de hallazgos: {len(findings)}")
    print(f"Archivos JSON: {json_output}")
    print(f"Archivos CSV: {csv_output}")
    print()
    print("Para visualizar los resultados, abre la interfaz 'Audit Bank Window'")
    print("y carga el archivo JSON generado.")
    print("=" * 60)

if __name__ == "__main__":
    main()


