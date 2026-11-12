import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export class D1 {
 constructor(file=':memory:'){this.db=new DatabaseSync(file);this.db.exec('PRAGMA foreign_keys=ON');}
 migrate(){this.db.exec(readFileSync(new URL('../migrations/0001_initial.sql',import.meta.url),'utf8'));}
 prepare(sql){const db=this.db;let args=[];const execute=()=>{const st=db.prepare(sql);if(st.columns().length)return {results:st.all(...args),success:true,meta:{changes:0}};return {results:[],success:true,meta:{changes:Number(st.run(...args).changes)}};};const obj={bind(...a){args=a;return obj;},async first(){return execute().results[0]||null;},async all(){return execute();},async run(){return execute();},execute};return obj;}
 async batch(list){this.db.exec('BEGIN IMMEDIATE');try{const result=list.map(q=>q.execute());this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
