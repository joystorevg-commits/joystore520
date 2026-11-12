import {mkdirSync,copyFileSync,cpSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');mkdirSync(resolve(root,'docs'),{recursive:true});
for(const name of ['index.html','style.css','loja.js','catalog-data.js','catalog-config.js'])copyFileSync(resolve(root,'public',name),resolve(root,'docs',name));
cpSync(resolve(root,'public/assets'),resolve(root,'docs/assets'),{recursive:true});writeFileSync(resolve(root,'docs/.nojekyll'),'');
console.log('Vitrine preparada em docs/. Configure docs/catalog-config.js para apontar para seu Worker.');
