const fs = require('fs');

function checkBrackets(filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const lines = content.split('\n');
  
  let parenStack = [];
  let braceStack = [];
  let bracketStack = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const lineNum = i + 1;
      
      if (char === '(') {
        parenStack.push({ line: lineNum, col: j + 1 });
      } else if (char === ')') {
        if (parenStack.length === 0) {
          console.log(`Unmatched ')' at line ${lineNum}, col ${j + 1}`);
        } else {
          parenStack.pop();
        }
      } else if (char === '{') {
        braceStack.push({ line: lineNum, col: j + 1 });
      } else if (char === '}') {
        if (braceStack.length === 0) {
          console.log(`Unmatched '}' at line ${lineNum}, col ${j + 1}`);
        } else {
          braceStack.pop();
        }
      } else if (char === '[') {
        bracketStack.push({ line: lineNum, col: j + 1 });
      } else if (char === ']') {
        if (bracketStack.length === 0) {
          console.log(`Unmatched ']' at line ${lineNum}, col ${j + 1}`);
        } else {
          bracketStack.pop();
        }
      }
    }
  }
  
  if (parenStack.length > 0) {
    console.log('Unmatched opening parentheses:');
    parenStack.forEach(p => console.log(`  Line ${p.line}, col ${p.col}`));
  }
  
  if (braceStack.length > 0) {
    console.log('Unmatched opening braces:');
    braceStack.forEach(b => console.log(`  Line ${b.line}, col ${b.col}`));
  }
  
  if (bracketStack.length > 0) {
    console.log('Unmatched opening brackets:');
    bracketStack.forEach(b => console.log(`  Line ${b.line}, col ${b.col}`));
  }
  
  if (parenStack.length === 0 && braceStack.length === 0 && bracketStack.length === 0) {
    console.log('All brackets are properly matched!');
  }
}

checkBrackets('src/pages/SBTManagement.tsx');