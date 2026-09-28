// check.js — быстрая проверка здоровья проекта «Наш год»
const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
process.chdir(root);

const GIT = 'C:\\Users\\Юлия\\AppData\\Local\\GitHubDesktop\\app-3.6.6\\resources\\app\\git\\cmd\\git.exe';

console.log('=== 1. node --check app.js ===');
try {
  cp.execSync('node --check app.js', { stdio: 'inherit' });
  console.log('EXIT=0');
} catch (e) {
  console.log('ОШИБКА синтаксиса app.js!');
}

console.log('\n=== 2. Баланс скобок style.css ===');
const css = fs.readFileSync('style.css', 'utf8');
const o = (css.match(/{/g) || []).length;
const cl = (css.match(/}/g) || []).length;
console.log(`open=${o} close=${cl} diff=${o - cl}`);

console.log('\n=== 3. Размеры файлов ===');
for (const f of ['style.css', 'index.html', 'app.js', 'sw.js']) {
  const st = fs.statSync(f);
  console.log(`${f}  ${st.size} б`);
}

console.log('\n=== 4. git nashgod ===');
try { console.log(cp.execSync(`"${GIT}" status -sb`).toString()); } catch (e) { console.log('(ошибка git)'); }

console.log('=== 5. git deploy ===');
try {
  console.log(cp.execSync(`"${GIT}" status -sb`, { cwd: 'C:\\Users\\Юлия\\Desktop\\_tmp_ghio' }).toString());
} catch (e) { console.log('(ошибка git)'); }

console.log('=== ГОТОВО ===');