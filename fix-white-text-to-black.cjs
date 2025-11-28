const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Buscar todos los archivos .tsx y .ts en src
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules')) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

const srcDir = path.join(__dirname, 'src');
const files = getAllFiles(srcDir);

let totalChanges = 0;

files.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    const originalContent = content;
    
    // Patrones a buscar y reemplazar
    const patterns = [
      // bg-white con text-white -> text-black
      { 
        search: /bg-white\s+text-white/g, 
        replace: 'bg-white text-black' 
      },
      // bg-white/10 text-white -> bg-white/10 text-black (pero solo si es fondo blanco sólido)
      { 
        search: /bg-white\/\d+\s+text-white/g, 
        replace: (match) => {
          // Si es bg-white/100 o bg-white (sin opacidad), cambiar a text-black
          if (match.includes('bg-white/100') || match.includes('bg-white ')) {
            return match.replace('text-white', 'text-black');
          }
          return match; // Mantener otros casos
        }
      },
      // bg-[#FFFFFF] text-white -> bg-[#FFFFFF] text-black
      { 
        search: /bg-\[#FFFFFF\]\s+text-white/g, 
        replace: 'bg-[#FFFFFF] text-black' 
      },
      // bg-[#fff] text-white -> bg-[#fff] text-black
      { 
        search: /bg-\[#fff\]\s+text-white/g, 
        replace: 'bg-[#fff] text-black' 
      },
      // bg-[#ffffff] text-white -> bg-[#ffffff] text-black
      { 
        search: /bg-\[#ffffff\]\s+text-white/g, 
        replace: 'bg-[#ffffff] text-black' 
      },
      // background: white con color: white -> color: black
      { 
        search: /background:\s*white[^;]*;\s*color:\s*white/g, 
        replace: (match) => match.replace('color: white', 'color: black')
      },
      // Casos específicos: bg-white text-[#ffffff] -> bg-white text-black
      { 
        search: /bg-white\s+text-\[#ffffff\]/g, 
        replace: 'bg-white text-black' 
      },
      // Casos con clases combinadas
      { 
        search: /className="[^"]*bg-white[^"]*text-white[^"]*"/g, 
        replace: (match) => match.replace('text-white', 'text-black')
      },
      // Casos con template literals
      { 
        search: /className=\{`[^`]*bg-white[^`]*text-white[^`]*`\}/g, 
        replace: (match) => match.replace('text-white', 'text-black')
      },
    ];
    
    patterns.forEach(({ search, replace }) => {
      if (typeof replace === 'function') {
        const newContent = content.replace(search, replace);
        if (newContent !== content) {
          content = newContent;
          changed = true;
        }
      } else {
        if (content.match(search)) {
          content = content.replace(search, replace);
          changed = true;
        }
      }
    });
    
    // Casos especiales: buscar bg-white seguido de text-white en la misma línea o línea siguiente
    const lines = content.split('\n');
    let newLines = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      const nextLine = lines[i + 1] || '';
      
      // Si esta línea tiene bg-white y la siguiente tiene text-white, cambiar
      if (line.includes('bg-white') && nextLine.includes('text-white') && !nextLine.includes('bg-')) {
        newLines.push(line);
        newLines.push(nextLine.replace('text-white', 'text-black'));
        i += 2;
        changed = true;
        continue;
      }
      
      // Si una línea tiene bg-white y text-white juntos
      if (line.includes('bg-white') && line.includes('text-white') && !line.includes('text-black')) {
        newLines.push(line.replace(/\btext-white\b/g, 'text-black'));
        changed = true;
        i++;
        continue;
      }
      
      newLines.push(line);
      i++;
    }
    
    if (changed) {
      content = newLines.join('\n');
      fs.writeFileSync(filePath, content, 'utf8');
      totalChanges++;
      console.log(`✅ Fixed: ${path.relative(__dirname, filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log(`\n✅ Total files modified: ${totalChanges}`);

