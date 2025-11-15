#!/bin/bash

# Script para reemplazar DTC1B por Digital Commercial Bank Ltd
# Autor: Sistema Automatizado
# Fecha: 2025-11-13

echo "═══════════════════════════════════════════════════════"
echo "   REEMPLAZO MASIVO: DTC1B → Digital Commercial Bank Ltd"
echo "═══════════════════════════════════════════════════════"
echo ""

# Contador
total_files=0
total_replacements=0

# Función para reemplazar en un archivo
replace_in_file() {
    local file="$1"
    local count_before=$(grep -io "dtc1b" "$file" 2>/dev/null | wc -l)

    if [ "$count_before" -gt 0 ]; then
        # Reemplazar todas las variantes
        sed -i 's/DTC1B/Digital Commercial Bank Ltd/g' "$file"
        sed -i 's/dtc1b/Digital Commercial Bank Ltd/g' "$file"
        sed -i 's/Dtc1b/Digital Commercial Bank Ltd/g' "$file"
        sed -i 's/DTC1b/Digital Commercial Bank Ltd/g' "$file"

        local count_after=$(grep -io "dtc1b" "$file" 2>/dev/null | wc -l)
        local replaced=$((count_before - count_after))

        if [ "$replaced" -gt 0 ]; then
            echo "✓ $file: $replaced ocurrencias reemplazadas"
            total_files=$((total_files + 1))
            total_replacements=$((total_replacements + replaced))
        fi
    fi
}

# Procesar archivos TypeScript/JavaScript
echo "[1/5] Procesando archivos TypeScript/JavaScript..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) | while read file; do
    replace_in_file "$file"
done

# Procesar archivos de documentación
echo ""
echo "[2/5] Procesando archivos de documentación (MD)..."
find . -maxdepth 1 -type f -name "*.md" | while read file; do
    replace_in_file "$file"
done

# Procesar archivos de texto
echo ""
echo "[3/5] Procesando archivos de texto (TXT)..."
find . -maxdepth 1 -type f -name "*.txt" | while read file; do
    replace_in_file "$file"
done

# Procesar archivos Python
echo ""
echo "[4/5] Procesando archivos Python..."
find . -maxdepth 1 -type f -name "*.py" | while read file; do
    replace_in_file "$file"
done

# Procesar otros archivos en src/lib
echo ""
echo "[5/5] Procesando archivos adicionales..."
find src/lib -type f -name "*.txt" -o -name "*.md" | while read file; do
    replace_in_file "$file"
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo "   RESUMEN DEL REEMPLAZO"
echo "═══════════════════════════════════════════════════════"
echo "Archivos modificados: $total_files"
echo "Total de reemplazos: $total_replacements"
echo ""
echo "✅ Proceso completado exitosamente"
echo "═══════════════════════════════════════════════════════"
